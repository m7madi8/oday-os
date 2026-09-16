import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SERVER_KEY = 'oday.serverUrl';

let runtimeUrl = '';

function isLoopback(url: string) {
  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

export function normalizeServerUrl(value: string) {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `http://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

export function defaultServerUrl() {
  if (Platform.OS === 'web') return 'http://127.0.0.1:8000';
  const fromEnv = normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL ?? '');
  if (fromEnv) return fromEnv;
  return '';
}

export function getApiUrl() {
  const stored = normalizeServerUrl(runtimeUrl);
  if (stored) return stored;
  const env = defaultServerUrl();
  if (env) return env;
  return 'http://127.0.0.1:8000';
}

export function getStoredServerUrl() {
  return normalizeServerUrl(runtimeUrl);
}

export async function loadStoredServerUrl() {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      runtimeUrl = normalizeServerUrl(window.localStorage.getItem(SERVER_KEY) ?? '');
    } else {
      const stored = await SecureStore.getItemAsync(SERVER_KEY);
      runtimeUrl = normalizeServerUrl(stored ?? '');
    }
  } catch {
    runtimeUrl = '';
  }
  return getApiUrl();
}

export async function persistServerUrl(value: string) {
  const next = normalizeServerUrl(value);
  runtimeUrl = next;
  if (next) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(SERVER_KEY, next);
    } else {
      await SecureStore.setItemAsync(SERVER_KEY, next);
    }
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(SERVER_KEY);
  } else {
    await SecureStore.deleteItemAsync(SERVER_KEY);
  }
  return next;
}

export function isPhysicalDeviceLoopback(url: string) {
  return Platform.OS !== 'web' && isLoopback(url);
}
