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

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function applyWindowSecurity(
  win: BrowserWindow,
  devServerUrl?: string,
  remoteOrigins: Set<string> = new Set(),
) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowedDev = Boolean(devServerUrl && url.startsWith(devServerUrl));
    const allowedApp = url.startsWith('oday://') || url.startsWith('file://');
    const allowedRemote = remoteOrigins.has(originOf(url));
    if (!allowedDev && !allowedApp && !allowedRemote) {
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
