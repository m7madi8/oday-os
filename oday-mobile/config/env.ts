import { getApiUrl } from '@/lib/server';

export const ENV = {
  get apiUrl() {
    return getApiUrl();
  },
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
