import { net } from 'electron';
import { readStoredKey } from './ipc/store';

function stripSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function deriveDashboardUrl(apiOrigin: string) {
  const raw = stripSlash(String(apiOrigin || '').trim());
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `http://${raw}`);
    url.port = '5173';
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.origin;
  } catch {
    return '';
  }
}

export function readConfiguredDashboardUrl() {
  const explicit = stripSlash(readStoredKey('dashboardUrl') || '');
  if (explicit) return explicit;
  const server = stripSlash(readStoredKey('serverUrl') || '');
  if (!server) return '';
  return deriveDashboardUrl(server);
}

export async function probeDashboardUrl(origin: string) {
  const base = stripSlash(origin);
  if (!base) return false;
  try {
    const response = await net.fetch(base, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function resolveRemoteDashboardUrl() {
  const configured = readConfiguredDashboardUrl();
  if (!configured) return null;
  if (await probeDashboardUrl(configured)) return configured;
  return null;
}

export function allowedRemoteOrigins() {
  const origins = new Set<string>();
  const configured = readConfiguredDashboardUrl();
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      /* ignore */
    }
  }
  const server = stripSlash(readStoredKey('serverUrl') || '');
  if (server) {
    try {
      const api = new URL(server.includes('://') ? server : `http://${server}`);
      origins.add(api.origin);
      const derived = deriveDashboardUrl(api.origin);
      if (derived) origins.add(new URL(derived).origin);
    } catch {
      /* ignore */
    }
  }
  return origins;
}
