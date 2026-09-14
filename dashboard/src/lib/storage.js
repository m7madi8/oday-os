const API_BASE = import.meta.env.VITE_ODAY_API || '/api/oday';
const TOKEN = import.meta.env.VITE_ODAY_TOKEN || 'oday-office-sync';
const META_PREFIX = '__oday_meta:';

const memory = new Map();
const listeners = new Set();

let status = TOKEN ? 'syncing' : 'offline';
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

function headers() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-ODAY-TOKEN': TOKEN,
    'X-Requested-With': 'XMLHttpRequest',
  };
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`sync ${response.status}`);
  }
  return response.json();
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
  if (!persistent || !TOKEN) return;
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
    await api(`/items/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, updated_at: meta.updated_at || Date.now() }),
    });
    writeLocal(key, value, meta.updated_at || Date.now(), false);
  }));
}

export async function syncFromServer() {
  if (!TOKEN) {
    emit('offline');
    return;
  }
  if (hydrating) return hydrating;

  hydrating = (async () => {
    try {
      emit('syncing');
      await flushDirty();
      const payload = await api('/items');
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
  if (!TOKEN) {
    emit('offline');
    return;
  }
  emit('syncing');
  try {
    await api(`/items/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, updated_at: updatedAt }),
    });
    writeLocal(key, value, updatedAt, false);
    emit('synced');
  } catch {
    emit('offline');
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
