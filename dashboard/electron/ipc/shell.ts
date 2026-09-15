import { ipcMain, shell } from 'electron';
import { isExternalUrl } from '../security';

export function registerShellIpc() {
  ipcMain.handle('oday:shell:open', async (_event, url: string) => {
    if (typeof url !== 'string' || !isExternalUrl(url)) return false;
    await shell.openExternal(url);
    return true;
  });
}
