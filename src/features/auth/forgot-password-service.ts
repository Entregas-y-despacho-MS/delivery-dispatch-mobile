import axios from 'axios';
import { env } from '@/config/env';

export interface ForgotPasswordFailure {
  kind: 'network' | 'validation' | 'server';
  title: string;
  message: string;
}

export interface ResetPasswordFailure {
  kind: 'invalid-token' | 'reuse' | 'policy' | 'network' | 'server';
  title: string;
  message: string;
}

const publicAuthClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export async function requestPasswordReset(email: string): Promise<void> {
  await publicAuthClient.post('/auth/forgot-password', {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<void> {
  await publicAuthClient.post('/auth/reset-password', {
    token: token.trim(),
    newPassword,
  });
}

export function getForgotPasswordFailure(error: unknown): ForgotPasswordFailure {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'server',
      title: 'Error inesperado',
      message: error instanceof Error ? error.message : 'No se pudo procesar la solicitud. Inténtalo de nuevo.',
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

  if (status === 400) {
    const rawMessage = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
    return {
      kind: 'validation',
      title: 'Datos inválidos',
      message: rawMessage || 'Ingresa un correo electrónico válido.',
    };
  }

  if (status === 429) {
    return {
      kind: 'server',
      title: 'Demasiados intentos',
      message: 'Has realizado demasiadas solicitudes en poco tiempo. Por favor, espera unos minutos.',
    };
  }

  return {
    kind: 'server',
    title: 'Error al solicitar recuperación',
    message: 'Ocurrió un error en el servidor. Por favor, inténtalo nuevamente más tarde.',
  };
}

export function getResetPasswordFailure(error: unknown): ResetPasswordFailure {
  if (!axios.isAxiosError(error)) {
    return {
      kind: 'server',
      title: 'Error inesperado',
      message: error instanceof Error ? error.message : 'No se pudo restablecer la contraseña. Inténtalo de nuevo.',
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

  if (code === 'INVALID_RESET_TOKEN' || status === 401) {
    return {
      kind: 'invalid-token',
      title: 'Código inválido o expirado',
      message: 'El código de restablecimiento no es válido o ha expirado (validez de 30 minutos). Solicita uno nuevo.',
    };
  }

  if (code === 'PASSWORD_RECENTLY_USED') {
    return {
      kind: 'reuse',
      title: 'Contraseña no permitida',
      message: 'No puedes reutilizar tu contraseña anterior ni ninguna de tus últimas 3 contraseñas utilizadas.',
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
      kind: 'server',
      title: 'Demasiados intentos',
      message: 'Has realizado demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentar.',
    };
  }

  const rawMessage = Array.isArray(data?.message) ? data?.message.join(', ') : data?.message;
  return {
    kind: 'server',
    title: 'No se pudo restablecer la contraseña',
    message: rawMessage || 'Ocurrió un error al restablecer la contraseña. Inténtalo nuevamente.',
  };
}
