import { desktop, isDesktop } from '../desktop';

const TOKEN_KEY = 'oday.token';
const USER_KEY = 'oday.user';
const COMPANY_KEY = 'oday.company';
export const LOCAL_TOKEN_PREFIX = 'local:';

export function isLocalToken(token) {
  return String(token || '').startsWith(LOCAL_TOKEN_PREFIX);
}

function webGet(key) {
  return window.sessionStorage.getItem(key);
}

function webSet(key, value) {
  window.sessionStorage.setItem(key, value);
}

function webClear(key) {
  window.sessionStorage.removeItem(key);
}

export async function saveSession(payload) {
  if (isDesktop()) {
    await desktop.store.set('token', payload.token);
    await desktop.store.set('user', JSON.stringify(payload.user));
    await desktop.store.set('company', JSON.stringify(payload.company));
    return;
  }
  webSet(TOKEN_KEY, payload.token);
  webSet(USER_KEY, JSON.stringify(payload.user));
  webSet(COMPANY_KEY, JSON.stringify(payload.company));
}

export async function loadSession() {
  try {
    let token;
    let userRaw;
    let companyRaw;
    if (isDesktop()) {
      token = await desktop.store.get('token');
      userRaw = await desktop.store.get('user');
      companyRaw = await desktop.store.get('company');
    } else {
      token = webGet(TOKEN_KEY);
      userRaw = webGet(USER_KEY);
      companyRaw = webGet(COMPANY_KEY);
    }
    if (!token || !userRaw || !companyRaw) return null;
    return {
      token,
      user: JSON.parse(userRaw),
      company: JSON.parse(companyRaw),
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function getToken() {
  if (isDesktop()) return desktop.store.get('token');
  return webGet(TOKEN_KEY);
}

export async function clearSession() {
  if (isDesktop()) {
    await Promise.all([
      desktop.store.delete('token'),
      desktop.store.delete('user'),
      desktop.store.delete('company'),
    ]);
    return;
  }
  webClear(TOKEN_KEY);
  webClear(USER_KEY);
  webClear(COMPANY_KEY);
}
