import { BrowserWindow, ipcMain, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export function registerPrintIpc() {
  ipcMain.handle('oday:print:pdf', async (_event, payload: { data: string; name?: string }) => {
    const filePath = path.join(os.tmpdir(), payload?.name || `oday-${Date.now()}.pdf`);
    await writeFile(filePath, Buffer.from(payload.data, 'base64'));
    const win = new BrowserWindow({
      width: 920,
      height: 1100,
      autoHideMenuBar: true,
      title: payload?.name || 'ODAY OS',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    await win.loadFile(filePath);
    win.webContents.print({ silent: false });
    return true;
  });

  ipcMain.handle('oday:print:open', async (_event, payload: { data: string; name?: string }) => {
    const filePath = path.join(os.tmpdir(), payload?.name || `oday-${Date.now()}.pdf`);
    await writeFile(filePath, Buffer.from(payload.data, 'base64'));
    await shell.openPath(filePath);
    return true;
  });
}
