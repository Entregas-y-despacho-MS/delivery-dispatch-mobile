import axios from 'axios';
import { env } from '@/config/env';

export interface ChangePasswordFailure {
  kind: 'session-expired' | 'reuse' | 'invalid-current' | 'policy' | 'network' | 'server';
  title: string;
  message: string;
}

const changePasswordClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export async function executeChangePassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await changePasswordClient.patch(
    '/auth/change-password',
    {
      currentPassword,
      newPassword,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

export function getChangePasswordFailure(error: unknown): ChangePasswordFailure {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'server',
      title: 'Error inesperado',
      message: error instanceof Error ? error.message : 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
    };
  }

  if (!error.response) {
    return {
      kind: 'network',
      title: 'Sin conexión',
      message: 'No se pudo conectar al servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
    };
  }

  const status = error.response.status;
  const data = error.response.data as { error?: string; message?: string | string[] } | undefined;
  const code = data?.error;

  if (code === 'INVALID_CREDENTIALS') {
    return {
      kind: 'invalid-current',
      title: 'Contraseña incorrecta',
      message: 'La contraseña actual no coincide con los registros del sistema.',
    };
  }

  if (code === 'INVALID_TOKEN' || status === 401) {
    return {
      kind: 'session-expired',
      title: 'Sesión expirada',
      message: 'Tu sesión temporal ha expirado. Por favor, inicia sesión nuevamente.',
    };
  }

  if (code === 'PASSWORD_RECENTLY_USED') {
    return {
      kind: 'reuse',
      title: 'Contraseña no permitida',
      message: 'No puedes reutilizar tu contraseña actual ni ninguna de tus últimas 3 contraseñas utilizadas.',
    };
  }

  if (code === 'PASSWORD_TOO_SHORT') {
    return {
      kind: 'policy',
      title: 'Contraseña muy corta',
      message: 'La nueva contraseña debe cumplir con la longitud mínima configurada en el sistema.',
    };
  }

  if (status === 429) {
    return {
      kind: 'policy',
      title: 'Demasiados intentos',
      message: 'Has realizado demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentar.',
    };
  }

  const rawMessage = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
  return {
    kind: 'server',
    title: 'No se pudo cambiar la contraseña',
    message: rawMessage || 'Ocurrió un error al actualizar la contraseña. Inténtalo nuevamente.',
  };
}
