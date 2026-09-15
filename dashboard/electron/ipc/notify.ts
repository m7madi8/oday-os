import { Notification, ipcMain } from 'electron';

export function registerNotifyIpc() {
  ipcMain.handle('oday:notify:show', (_event, payload: { title?: string; body?: string }) => {
    if (!Notification.isSupported()) return false;
    const title = String(payload?.title || 'ODAY OS').slice(0, 120);
    const body = String(payload?.body || '').slice(0, 280);
    new Notification({ title, body }).show();
    return true;
  });
}
