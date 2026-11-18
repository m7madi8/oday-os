import { getDesktop, isDesktop } from '../desktop';

import { isLocalToken as isLocalTokenFromOffice } from './office';

const TOKEN_KEY = 'oday.token';
const USER_KEY = 'oday.user';
const COMPANY_KEY = 'oday.company';
export { LOCAL_TOKEN_PREFIX } from './office';

let memorySession = null;

export function isLocalToken(token) {
  return isLocalTokenFromOffice(token);
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
  memorySession = {
    token: payload.token,
    user: payload.user,
    company: payload.company,
  };
  const store = isDesktop() ? getDesktop()?.store : null;
  if (store) {
    await store.set('token', payload.token);
    await store.set('user', JSON.stringify(payload.user));
    await store.set('company', JSON.stringify(payload.company));
    return;
  }
  webSet(TOKEN_KEY, payload.token);
  webSet(USER_KEY, JSON.stringify(payload.user));
  webSet(COMPANY_KEY, JSON.stringify(payload.company));
}

export async function loadSession() {
  try {
    if (memorySession?.token && memorySession.user && memorySession.company) {
      return memorySession;
    }
    let token;
    let userRaw;
    let companyRaw;
    const store = isDesktop() ? getDesktop()?.store : null;
    if (store) {
      token = await store.get('token');
      userRaw = await store.get('user');
      companyRaw = await store.get('company');
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
  if (memorySession?.token) return memorySession.token;
  const store = isDesktop() ? getDesktop()?.store : null;
  if (store) return store.get('token');
  return webGet(TOKEN_KEY);
}

export async function clearSession() {
  memorySession = null;
  const store = isDesktop() ? getDesktop()?.store : null;
  if (store) {
    await Promise.all([
      store.delete('token'),
      store.delete('user'),
      store.delete('company'),
    ]);
    return;
  }
  webClear(TOKEN_KEY);
  webClear(USER_KEY);
  webClear(COMPANY_KEY);
}
