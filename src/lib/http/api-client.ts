import axios from 'axios';
import { env } from '@/config/env';

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | undefined;

export function configureTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenProvider?.();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
