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

export async function saveSession(payload: LoginResponse) {
  await SecureStore.setItemAsync(TOKEN_KEY, payload.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(payload.user));
  await SecureStore.setItemAsync(COMPANY_KEY, JSON.stringify(payload.company));
}

export async function loadSession(): Promise<StoredSession | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const userRaw = await SecureStore.getItemAsync(USER_KEY);
  const companyRaw = await SecureStore.getItemAsync(COMPANY_KEY);
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
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(COMPANY_KEY),
  ]);
}
