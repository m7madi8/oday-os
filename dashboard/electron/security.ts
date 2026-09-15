import { session, shell, type BrowserWindow } from 'electron';

const ALLOWED_SCHEMES = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function applyWindowSecurity(win: BrowserWindow, devServerUrl?: string) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowedDev = Boolean(devServerUrl && url.startsWith(devServerUrl));
    const allowedApp = url.startsWith('oday://') || url.startsWith('file://');
    if (!allowedDev && !allowedApp) {
      event.preventDefault();
      if (isExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

export function hardenSession() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
}
