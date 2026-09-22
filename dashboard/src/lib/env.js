import { getDesktop, isDesktop } from './desktop';

let runtimeServerUrl = '';

export function normalizeServerUrl(value) {
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

export function setRuntimeServerUrl(value) {
  runtimeServerUrl = normalizeServerUrl(value);
  return runtimeServerUrl;
}

export function getRuntimeServerUrl() {
  return runtimeServerUrl;
}

export function getApiRoot() {
  if (isDesktop()) return runtimeServerUrl;
  return String(import.meta.env.VITE_ODAY_API_URL || '').replace(/\/$/, '');
}

export async function loadStoredServerUrl() {
  const bridge = getDesktop();
  if (!isDesktop() || !bridge?.store) return '';
  const stored = await bridge.store.get('serverUrl');
  const next = setRuntimeServerUrl(stored || '');
  await bridge.updates?.syncServer?.();
  return next;
}

export async function persistServerUrl(value) {
  const next = setRuntimeServerUrl(value);
  const bridge = getDesktop();
  if (isDesktop() && bridge?.store) {
    if (next) await bridge.store.set('serverUrl', next);
    else await bridge.store.delete('serverUrl');
    await bridge.updates?.syncServer?.();
    await bridge.ui?.reload?.();
  }
  return next;
}
