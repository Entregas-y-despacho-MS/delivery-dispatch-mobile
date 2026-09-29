import axios from 'axios';
import { env } from '@/config/env';
import { queryClient } from '@/lib/query/query-client';
import { clearTrackingTelemetry, getTrackingAccount, setTrackingAccount } from '@/features/tracking';
import {
  clearSessionTokens,
  finishSessionRestore,
  getSessionGeneration,
  getSessionTokens,
  restoreSessionTokens,
  saveSessionTokens,
  type SessionTokens,
} from './session';

interface AuthResponse extends SessionTokens {
  mustChangePassword: boolean;
}

const authClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let startupPromise: Promise<void> | null = null;
let refreshInFlight: { generation: number; promise: Promise<string | null> } | null = null;

function readAuthResponse(value: unknown): AuthResponse {
  if (!value || typeof value !== 'object') throw new Error('Respuesta de autenticación inválida.');
  const response = value as Partial<AuthResponse>;
  if (!response.accessToken || !response.refreshToken
    || typeof response.accessToken !== 'string' || typeof response.refreshToken !== 'string') {
    throw new Error('El servidor no devolvió los tokens de sesión.');
  }
  if (response.mustChangePassword !== false) {
    throw new Error('Tu contraseña debe cambiarse antes de continuar. Esta opción aún no está disponible en la app.');
  }
  return response as AuthResponse;
}

export async function signIn(username: string, password: string, totpCode?: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const { data } = await authClient.post<unknown>('/auth/login', {
    username: username.trim(),
    password,
    ...(totpCode ? { totpCode } : {}),
  });
  const response = readAuthResponse(data);

  // Evitar que otra cuenta transmita los puntos GPS del conductor anterior (persistido en SQLite)
  const previousAccount = await getTrackingAccount();
  if (previousAccount && previousAccount !== normalizedUsername) {
    await clearTrackingTelemetry();
  }
  await setTrackingAccount(normalizedUsername);

  await saveSessionTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken }, true);
}

export async function expireSession() {
  queryClient.clear();
  await clearSessionTokens();
}

export async function refreshSession(): Promise<string | null> {
  const previousGeneration = getSessionGeneration();
  if (refreshInFlight?.generation === previousGeneration) return refreshInFlight.promise;
  const previous = getSessionTokens();
  if (!previous) return null;

  const promise = (async () => {
    try {
      const { data } = await authClient.post<unknown>('/auth/refresh', {
        refreshToken: previous.refreshToken,
      });
      const response = readAuthResponse(data);
      if (getSessionGeneration() !== previousGeneration
        || getSessionTokens()?.refreshToken !== previous.refreshToken) {
        return null;
      }
      await saveSessionTokens({ accessToken: response.accessToken, refreshToken: response.refreshToken });
      return response.accessToken;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const definitive = !axios.isAxiosError(error) || [400, 401, 403].includes(status ?? 0);
      if (!definitive) throw error;
      if (getSessionTokens()?.refreshToken === previous.refreshToken) {
        await expireSession();
      }
      return null;
    }
  })().finally(() => {
    if (refreshInFlight?.promise === promise) refreshInFlight = null;
  });

  refreshInFlight = { generation: previousGeneration, promise };
  return promise;
}

export function initializeSession() {
  if (!startupPromise) {
    startupPromise = (async () => {
      try {
        const stored = await restoreSessionTokens();
        if (stored) {
          try {
            await refreshSession();
          } catch {
            // A network outage must not erase a driver's offline session.
          }
        }
      } finally {
        finishSessionRestore();
      }
    })();
  }
  return startupPromise;
}

export async function signOut() {
  const accessToken = getSessionTokens()?.accessToken;
  try {
    if (accessToken) {
      await authClient.post('/auth/logout', undefined, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 3000,
      });
    }
  } catch {
    // Falla de red o timeout no deben impedir la purga local de la sesión
  } finally {
    await expireSession();
  }
}
