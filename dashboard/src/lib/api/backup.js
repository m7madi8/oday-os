import { api, apiBlob } from './client';

export function fetchBackupSettings() {
  return api('/api/backup/settings');
}

export function saveBackupSettings(body) {
  return api('/api/backup/settings', { method: 'PUT', body });
}

export function testBackupLocalFolder(path) {
  return api('/api/backup/test-local', { method: 'POST', body: { path } });
}

export function connectBackupGoogle() {
  return api('/api/backup/google/connect');
}

export function disconnectBackupGoogle() {
  return api('/api/backup/google', { method: 'DELETE' });
}

export function runBackupNow() {
  return api('/api/backup/run', { method: 'POST' });
}

export function fetchBackupRuns() {
  return api('/api/backup/runs');
}

export function retryBackupRun(id, destination) {
  return api(`/api/backup/runs/${id}/retry`, { method: 'POST', body: { destination } });
}

export async function downloadBackupRun(id) {
  const token = await import('../auth/session').then((m) => m.getToken());
  const root = String(import.meta.env.VITE_ODAY_API_URL || '').replace(/\/$/, '');
  const response = await fetch(`${root}/api/backup/runs/${id}/download`, {
    headers: {
      Accept: 'application/octet-stream',
      'X-API-TOKEN': token || '',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!response.ok) {
    throw new Error('تعذر تنزيل النسخة');
  }
  return response.blob();
}

export function markBackupLocalSynced(id, checksum) {
  return api(`/api/backup/runs/${id}/local-synced`, { method: 'POST', body: { checksum } });
}

export function restoreBackupRun(runId) {
  return api('/api/backup/restore', { method: 'POST', body: { run_id: runId, confirm: true } });
}
