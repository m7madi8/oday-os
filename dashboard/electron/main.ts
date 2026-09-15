import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, net, protocol } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyWindowSecurity, hardenSession } from './security';
import { registerStoreIpc } from './ipc/store';
import { registerFilesIpc } from './ipc/files';
import { registerShellIpc } from './ipc/shell';
import { registerNotifyIpc } from './ipc/notify';
import { registerPrintIpc } from './ipc/print';
import { setupAutoUpdater } from './updater';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'oday',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function preloadPath() {
  const mjs = path.join(__dirname, 'preload.mjs');
  const js = path.join(__dirname, 'preload.js');
  return existsSync(mjs) ? mjs : js;
}

function distRoot() {
  return path.join(__dirname, '../dist');
}

function appIconPath() {
  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, 'icon.ico'),
    path.join(__dirname, '../build/icon.png'),
  ];
  return candidates.find((file) => existsSync(file));
}

function appIconImage() {
  const file = appIconPath();
  if (!file) return undefined;
  const image = nativeImage.createFromPath(file);
  return image.isEmpty() ? undefined : image;
}

function registerAppProtocol() {
  protocol.handle('oday', (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname || '/').replace(/^\/+/, '');
    if (!pathname || pathname.endsWith('/')) pathname = `${pathname}index.html`.replace(/^\/+/, '');
    const root = distRoot();
    const resolved = path.resolve(root, pathname);
    const relative = path.relative(root, resolved);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      return new Response('Forbidden', { status: 403 });
    }
    return net.fetch(pathToFileURL(resolved).href);
  });
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  const icon = appIconImage();
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    backgroundColor: '#111214',
    autoHideMenuBar: true,
    frame: false,
    title: 'ODAY OS',
    icon,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isMac
      ? undefined
      : {
          color: '#111214',
          symbolColor: '#E6E8ED',
          height: 40,
        },
    trafficLightPosition: { x: 16, y: 12 },
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      webviewTag: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  applyWindowSecurity(win, devServerUrl);
  mainWindow = win;
  if (icon) win.setIcon(icon);

  win.once('ready-to-show', () => {
    win.webContents.setZoomFactor(1);
    win.show();
  });
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
  });
  void win.webContents.setVisualZoomLevelLimits(1, 1);

  if (devServerUrl) {
    void win.loadURL(devServerUrl);
  } else {
    void win.loadURL('oday://index.html');
  }

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function registerShortcuts(win: BrowserWindow) {
  globalShortcut.register('F11', () => {
    if (win.isDestroyed()) return;
    win.setFullScreen(!win.isFullScreen());
  });
}

function currentWindow() {
  return mainWindow ?? BrowserWindow.getFocusedWindow();
}

app.setName('ODAY OS');
if (process.platform === 'win32') {
  app.setAppUserModelId('os.oday.desktop');
}

app.whenReady().then(async () => {
  hardenSession();
  if (!process.env.VITE_DEV_SERVER_URL) {
    registerAppProtocol();
  }
  registerStoreIpc();
  registerFilesIpc();
  registerShellIpc();
  registerNotifyIpc();
  registerPrintIpc();

  ipcMain.handle('oday:window:minimize', () => currentWindow()?.minimize());
  ipcMain.handle('oday:window:maximize', () => {
    const win = currentWindow();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('oday:window:close', () => currentWindow()?.close());
  ipcMain.handle('oday:window:isMaximized', () => Boolean(currentWindow()?.isMaximized()));
  ipcMain.handle('oday:window:fullscreen', () => {
    const win = currentWindow();
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });
  ipcMain.handle('oday:app:platform', () => process.platform);

  await setupAutoUpdater(() => mainWindow);
  const win = createWindow();
  registerShortcuts(win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createWindow();
      registerShortcuts(next);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
