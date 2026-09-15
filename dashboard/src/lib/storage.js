import { api } from './api/client';

const META_PREFIX = '__oday_meta:';
const memory = new Map();
const listeners = new Set();
let status = 'syncing';
let hydrating = null;

function canUseLocalStorage() {
  try {
    const key = '__oday_storage__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const persistent = canUseLocalStorage();

function emit(next) {
  status = next;
  listeners.forEach((listener) => listener(status));
}

export function getSyncStatus() {
  return status;
}

export function onSyncStatus(listener) {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

function metaKey(key) {
  return `${META_PREFIX}${key}`;
}

function readMeta(key) {
  if (!persistent) return { updated_at: 0, dirty: false };
  try {
    return JSON.parse(window.localStorage.getItem(metaKey(key)) || 'null') || { updated_at: 0, dirty: false };
  } catch {
    return { updated_at: 0, dirty: false };
  }
}

function writeLocal(key, value, updatedAt, dirty) {
  if (persistent) {
    window.localStorage.setItem(key, value);
    window.localStorage.setItem(metaKey(key), JSON.stringify({ updated_at: updatedAt, dirty }));
    return;
  }
  memory.set(key, value);
}

function readLocal(key) {
  if (persistent) return window.localStorage.getItem(key);
  return memory.has(key) ? memory.get(key) : null;
}

async function flushDirty() {
  if (!persistent) return;
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const storageKey = window.localStorage.key(i);
    if (storageKey && storageKey.startsWith(META_PREFIX)) {
      keys.push(storageKey.slice(META_PREFIX.length));
    }
  }
  await Promise.all(keys.map(async (key) => {
    const meta = readMeta(key);
    const value = readLocal(key);
    if (!meta.dirty || value == null) return;
    await api(`/api/oday/mobile/items/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, updated_at: meta.updated_at || Date.now() },
    });
    writeLocal(key, value, meta.updated_at || Date.now(), false);
  }));
}

export async function syncFromServer() {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      emit('syncing');
      await flushDirty();
      const payload = await api('/api/oday/mobile/items');
      const items = payload.items || {};
      Object.entries(items).forEach(([key, row]) => {
        const meta = readMeta(key);
        const remoteUpdated = Number(row?.updated_at) || 0;
        if (meta.dirty && meta.updated_at > remoteUpdated) return;
        if (typeof row?.value === 'string' && remoteUpdated >= meta.updated_at) {
          writeLocal(key, row.value, remoteUpdated, false);
        }
      });
      emit('synced');
    } catch {
      emit('offline');
    } finally {
      hydrating = null;
    }
  })();
  return hydrating;
}

export async function getItem(key) {
  await syncFromServer();
  return { value: readLocal(key) };
}

export async function setItem(key, value) {
  const updatedAt = Date.now();
  writeLocal(key, value, updatedAt, true);
  emit('syncing');
  try {
    await api(`/api/oday/mobile/items/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, updated_at: updatedAt },
    });
    writeLocal(key, value, updatedAt, false);
    emit('synced');
  } catch {
    emit('offline');
    throw new Error('تعذر حفظ البيانات على الخادم');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncFromServer();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncFromServer();
  });
}
