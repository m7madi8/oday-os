function isLoopback(url: string) {
  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

function resolveApiUrl() {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

  if (!raw) {
    if (appEnv === 'development') {
      return 'http://127.0.0.1:8000';
    }
    throw new Error('EXPO_PUBLIC_API_URL is required for this build.');
  }

  if (isLoopback(raw) && appEnv !== 'development') {
    throw new Error('EXPO_PUBLIC_API_URL must be a host the phone can reach, not localhost.');
  }

  return raw;
}

export const ENV = {
  apiUrl: resolveApiUrl(),
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
} as const;
