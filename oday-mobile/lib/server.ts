import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { acceptServerUrl, appStage, resolveApiUrl } from './serverPolicy';

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
  const stage = appStage(process.env.EXPO_PUBLIC_APP_ENV);
  const fromEnv = acceptServerUrl(stage, normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL ?? ''));
  if (fromEnv) return fromEnv;
  if (stage === 'development' && Platform.OS === 'web') return 'http://127.0.0.1:8000';
  return '';
}

export function getApiUrl() {
  const stage = appStage(process.env.EXPO_PUBLIC_APP_ENV);
  return resolveApiUrl({
    stage,
    stored: normalizeServerUrl(runtimeUrl),
    envUrl: normalizeServerUrl(process.env.EXPO_PUBLIC_API_URL ?? ''),
    allowDevelopmentFallback: stage === 'development',
  });
}

export function getStoredServerUrl() {
  return normalizeServerUrl(runtimeUrl);
}

export async function loadStoredServerUrl() {
  const stage = appStage(process.env.EXPO_PUBLIC_APP_ENV);
  try {
    const raw = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.localStorage.getItem(SERVER_KEY) ?? ''
      : (await SecureStore.getItemAsync(SERVER_KEY)) ?? '';
    const accepted = acceptServerUrl(stage, normalizeServerUrl(raw));
    runtimeUrl = accepted;
    if (raw && !accepted) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.localStorage.removeItem(SERVER_KEY);
      else await SecureStore.deleteItemAsync(SERVER_KEY);
    }
  } catch {
    runtimeUrl = '';
  }
  return getApiUrl();
}

export async function persistServerUrl(value: string) {
  const next = acceptServerUrl(appStage(process.env.EXPO_PUBLIC_APP_ENV), normalizeServerUrl(value));
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
