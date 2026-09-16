import type { LoginResponse } from '@/types/api';

export const LOCAL_TOKEN_PREFIX = 'local:';

const OFFICE_USERNAME = 'oday';
const OFFICE_PASSWORD = 'oday';

export function isLocalToken(token?: string | null) {
  return String(token || '').startsWith(LOCAL_TOKEN_PREFIX);
}

export function isOfficeLogin(username: string, password: string) {
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
