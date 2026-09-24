import axios, { AxiosHeaders, type AxiosResponse } from 'axios';

export type LoginFailure =
  | { kind: 'totp-required' }
  | { kind: 'invalid-totp' }
  | { kind: 'alert'; title: string; message: string };

function lockoutMessage(headers: AxiosResponse['headers'] | undefined) {
  const retryAfter = headers instanceof AxiosHeaders
    ? headers.get('Retry-After')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (typeof retryAfter !== 'string') {
    return 'Tu cuenta está bloqueada temporalmente. Inténtalo de nuevo más tarde.';
  }

  const seconds = Number(retryAfter);
  const remainingSeconds = Number.isFinite(seconds)
    ? seconds
    : (Date.parse(retryAfter) - Date.now()) / 1000;
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
    return 'Tu cuenta está bloqueada temporalmente. Inténtalo de nuevo más tarde.';
  }

  const minutes = Math.ceil(remainingSeconds / 60);
  return `Tu cuenta está bloqueada. Inténtalo de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`;
}

export function getLoginFailure(error: unknown): LoginFailure {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'alert',
      title: 'No se pudo iniciar sesión',
      message: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
    };
  }

  const code = (error.response?.data as { error?: string } | undefined)?.error;
  if (code === 'TOTP_REQUIRED') return { kind: 'totp-required' };
  if (code === 'INVALID_TOTP_CODE') return { kind: 'invalid-totp' };
  if (code === 'ACCOUNT_LOCKED' || error.response?.status === 423) {
    return { kind: 'alert', title: 'Cuenta bloqueada', message: lockoutMessage(error.response?.headers) };
  }
  if (error.response?.status === 401) {
    return { kind: 'alert', title: 'No se pudo iniciar sesión', message: 'Revisa tu usuario y contraseña.' };
  }
  if (error.response?.status === 403) {
    return { kind: 'alert', title: 'Acceso denegado', message: 'No tienes permiso para iniciar sesión. Contacta al administrador.' };
  }
  if (!error.response) {
    return { kind: 'alert', title: 'Sin conexión', message: 'No se pudo conectar al servidor. Revisa tu conexión e inténtalo de nuevo.' };
  }
  return { kind: 'alert', title: 'Error del servidor', message: 'No se pudo iniciar sesión en este momento. Inténtalo de nuevo.' };
}
