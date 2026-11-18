import { BrowserWindow, ipcMain, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { safePdfFileName } from './printName';

function pdfInTemp(name: string | undefined) {
  const filePath = path.join(os.tmpdir(), safePdfFileName(name));
  const relative = path.relative(os.tmpdir(), filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('invalid_print_name');
  }
  return filePath;
}

export function registerPrintIpc() {
  ipcMain.handle('oday:print:pdf', async (_event, payload: { data: string; name?: string }) => {
    if (typeof payload?.data !== 'string' || !payload.data) return false;
    const filePath = pdfInTemp(payload.name);
    await writeFile(filePath, Buffer.from(payload.data, 'base64'));
    const win = new BrowserWindow({
      width: 920,
      height: 1100,
      autoHideMenuBar: true,
      title: safePdfFileName(payload.name),
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
    if (typeof payload?.data !== 'string' || !payload.data) return false;
    const filePath = pdfInTemp(payload.name);
    await writeFile(filePath, Buffer.from(payload.data, 'base64'));
    await shell.openPath(filePath);
    return true;
  });
}
