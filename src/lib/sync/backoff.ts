import axios from 'axios';

export interface BackoffConfig {
  baseMs?: number;
  maxMs?: number;
  factor?: number;
  jitterRatio?: number;
}

const DEFAULT_BASE_MS = 1000; // 1 segundo base
const DEFAULT_MAX_MS = 60000; // 60 segundos máximo
const DEFAULT_FACTOR = 2;
const DEFAULT_JITTER_RATIO = 0.15; // +/- 15% de variación aleatoria

/**
 * Calcula el tiempo de espera (delay) en milisegundos aplicando backoff exponencial con jitter.
 *
 * delay = min(base * factor^(attempts), max) * (1 +/- jitter)
 */
export function calculateBackoffDelay(
  attempts: number,
  config: BackoffConfig = {}
): number {
  const base = config.baseMs ?? DEFAULT_BASE_MS;
  const max = config.maxMs ?? DEFAULT_MAX_MS;
  const factor = config.factor ?? DEFAULT_FACTOR;
  const jitterRatio = config.jitterRatio ?? DEFAULT_JITTER_RATIO;

  const rawDelay = Math.min(base * Math.pow(factor, Math.max(0, attempts)), max);

  // Aplicar jitter: número entre -jitterRatio y +jitterRatio
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * jitterRatio;
  const finalDelay = Math.round(rawDelay * jitterMultiplier);

  return Math.max(0, finalDelay);
}

/**
 * Clasifica si un error HTTP o de red amerita reintento (errores 5xx, timeout, caídas de red)
 * o si es un fallo definitivo de cliente 4xx (400, 404, 422).
 */
export function isRetryableError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    // Si no hubo respuesta del servidor (timeout, corte de red, DNS caído)
    if (!error.response) {
      return true;
    }

    const status = error.response.status;

    // Errores de servidor (5xx) y rate limit (429) son reintentables
    if (status === 429 || (status >= 500 && status <= 599)) {
      return true;
    }

    // Errores de cliente (400 Bad Request, 404 Not Found, 409 Conflict, 422 Unprocessable Entity)
    // no se solucionan reintentando el mismo payload idéntico.
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Errores genéricos no identificados se consideran reintentables por prudencia
  return true;
}

/**
 * Extrae un mensaje de error legible para registrar en `last_error` de la base de datos.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as { message?: string | string[]; error?: string };
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      if (typeof data.message === 'string') {
        return data.message;
      }
      if (typeof data.error === 'string') {
        return data.error;
      }
    }
    return error.message || `HTTP ${error.response?.status ?? 'Error'}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
