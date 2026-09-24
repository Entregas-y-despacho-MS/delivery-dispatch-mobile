import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { expireSession, refreshSession } from '@/features/auth/auth-service';
import { getSessionGeneration, getSessionTokens } from '@/features/auth/session';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const request = config as RetryConfig;
  request._authGeneration ??= getSessionGeneration();
  const token = getSessionTokens()?.accessToken;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

interface RetryConfig extends InternalAxiosRequestConfig {
  _authRetried?: boolean;
  _authGeneration?: number;
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    return Promise.reject(error);
  }

  const original = error.config as RetryConfig;
  if (original._authGeneration !== getSessionGeneration()) {
    return Promise.reject(error);
  }
  if (original._authRetried) {
    const sentToken = AxiosHeaders.from(original.headers).get('Authorization');
    if (sentToken === `Bearer ${getSessionTokens()?.accessToken}`) {
      await expireSession().catch(() => undefined);
    }
    return Promise.reject(error);
  }
  original._authRetried = true;

  const originalRefreshToken = getSessionTokens()?.refreshToken;
  const current = getSessionTokens()?.accessToken;
  const sentToken = AxiosHeaders.from(original.headers).get('Authorization');
  let nextToken = current && sentToken !== `Bearer ${current}` ? current : null;

  if (!nextToken) {
    try {
      nextToken = await refreshSession();
    } catch {
      // A transport error during refresh is not proof that the session expired.
      return Promise.reject(error);
    }
  }

  if (!nextToken) {
    if (getSessionTokens()?.refreshToken === originalRefreshToken) {
      await expireSession().catch(() => undefined);
    }
    return Promise.reject(error);
  }

  original.headers = AxiosHeaders.from(original.headers);
  original.headers.set('Authorization', `Bearer ${nextToken}`);
  return apiClient(original);
});
