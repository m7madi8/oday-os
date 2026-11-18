import type { LoginResponse } from '@/types/api';

export const LOCAL_TOKEN_PREFIX = 'local:';

const OFFICE_USERNAME = 'oday';
const OFFICE_PASSWORD = 'oday';

/** Local demo login — Expo development only, never in production/release builds. */
export function isLocalOfficeLoginEnabled(): boolean {
  if (!__DEV__) {
    return false;
  }
  const env = String(process.env.EXPO_PUBLIC_APP_ENV ?? '').toLowerCase();
  return env !== 'production';
}

export function isLocalToken(token?: string | null) {
  return String(token || '').startsWith(LOCAL_TOKEN_PREFIX);
}

export function isOfficeLogin(username: string, password: string) {
  if (!isLocalOfficeLoginEnabled()) {
    return false;
  }
  return (
    username.trim().toLowerCase() === OFFICE_USERNAME &&
    password.trim() === OFFICE_PASSWORD
  );
}

export function localOfficeSession(): LoginResponse {
  return {
    token: `${LOCAL_TOKEN_PREFIX}oday`,
    user: {
      id: 'oday',
      email: 'oday',
      first_name: 'عدي',
      last_name: 'أبو ضحى',
      is_admin: true,
      is_owner: true,
      permissions: '',
    },
    company: {
      id: 'oday',
      name: 'مكتب عدي أبو ضحى',
      currency_id: '1',
    },
  };
}

export function tryLocalOfficeSession(username: string, password: string): LoginResponse | null {
  if (!isOfficeLogin(username, password)) {
    return null;
  }
  return localOfficeSession();
}
