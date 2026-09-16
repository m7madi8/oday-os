import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { LoginResponse, SessionCompany, SessionUser } from '@/types/api';

const TOKEN_KEY = 'oday.token';
const USER_KEY = 'oday.user';
const COMPANY_KEY = 'oday.company';

export type StoredSession = {
  token: string;
  user: SessionUser;
  company: SessionCompany;
};

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      window.sessionStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(payload: LoginResponse) {
  await setItem(TOKEN_KEY, payload.token);
  await setItem(USER_KEY, JSON.stringify(payload.user));
  await setItem(COMPANY_KEY, JSON.stringify(payload.company));
}

export async function loadSession(): Promise<StoredSession | null> {
  const token = await getItem(TOKEN_KEY);
  const userRaw = await getItem(USER_KEY);
  const companyRaw = await getItem(COMPANY_KEY);
  if (!token || !userRaw || !companyRaw) {
    return null;
  }
  try {
    return {
      token,
      user: JSON.parse(userRaw) as SessionUser,
      company: JSON.parse(companyRaw) as SessionCompany,
    };
  } catch {
    await clearSession();
    return null;
  }
}

export async function getToken() {
  return getItem(TOKEN_KEY);
}

export async function clearSession() {
  await Promise.all([
    deleteItem(TOKEN_KEY),
    deleteItem(USER_KEY),
    deleteItem(COMPANY_KEY),
  ]);
}
