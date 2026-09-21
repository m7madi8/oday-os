const DB_NAME = 'oday-backup';
const STORE = 'handles';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirectoryHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, 'local');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDirectoryHandle() {
  const db = await openDb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('local');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

export async function pickLocalBackupDirectory() {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error('المتصفح لا يدعم اختيار مجلد محلي. استخدم Chrome أو Edge أو تطبيق سطح المكتب.');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await saveDirectoryHandle(handle);
  return handle;
}

async function ensurePermission(handle) {
  if (!handle) return false;
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function syncPendingLocalBackups(runs, markSynced) {
  const handle = await loadDirectoryHandle();
  if (!handle) return { synced: 0, skipped: runs.length };
  if (!(await ensurePermission(handle))) {
    throw new Error('يلزم إعادة السماح للمجلد المحلي');
  }

  let synced = 0;
  for (const run of runs) {
    if (run.local_status !== 'pending_sync' || !run.checksum_sha256) continue;
    const fileHandle = await handle.getFileHandle(run.file_name, { create: true });
    const writable = await fileHandle.createWritable();
    const blob = await downloadRunBlob(run.id);
    await writable.write(blob);
    await writable.close();
    const checksum = await sha256Hex(await blob.arrayBuffer());
    if (checksum !== run.checksum_sha256) {
      throw new Error(`فشل التحقق من ${run.file_name}`);
    }
    await markSynced(run.id, run.checksum_sha256);
    synced += 1;
  }
  return { synced, skipped: runs.length - synced };
}

async function downloadRunBlob(id) {
  const { downloadBackupRun } = await import('../api/backup');
  return downloadBackupRun(id);
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function supportsDirectoryPicker() {
  return typeof window.showDirectoryPicker === 'function';
}
