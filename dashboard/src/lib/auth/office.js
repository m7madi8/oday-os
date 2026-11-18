/** Local office demo login — development only; never enabled in production builds. */

export const LOCAL_TOKEN_PREFIX = 'local:';

const OFFICE_USERNAME = 'oday';
const OFFICE_PASSWORD = 'oday';

export function isLocalOfficeLoginEnabled() {
  return import.meta.env.DEV === true;
}

export function isLocalToken(token) {
  return String(token || '').startsWith(LOCAL_TOKEN_PREFIX);
}

export function isOfficeLogin(username, password) {
  if (!isLocalOfficeLoginEnabled()) {
    return false;
  }
  return (
    String(username || '').trim().toLowerCase() === OFFICE_USERNAME &&
    String(password || '').trim() === OFFICE_PASSWORD
  );
}

export function localOfficeSession() {
  return {
    token: 'local:oday',
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

/** @returns {ReturnType<typeof localOfficeSession> | null} */
export function tryLocalOfficeSession(username, password) {
  if (!isOfficeLogin(username, password)) {
    return null;
  }
  return localOfficeSession();
}
