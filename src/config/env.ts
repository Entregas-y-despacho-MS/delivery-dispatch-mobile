import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:3000/api',
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
