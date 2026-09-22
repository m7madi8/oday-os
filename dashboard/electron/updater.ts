import { app, ipcMain, powerMonitor, type BrowserWindow } from 'electron';
import electronUpdater from 'electron-updater';
import type { ProgressInfo, UpdateInfo } from 'electron-updater';

const { autoUpdater } = electronUpdater;
import type { UpdateStatePayload } from './updaterTypes';

const CHECK_EVERY_MS = 5 * 60 * 1000;
const ERROR_RESET_MS = 8_000;

let getWindow: () => BrowserWindow | null = () => null;
let checking = false;
let lastFocusCheck = 0;
let readyDismissed = false;
let readyVersion = '';

let state: UpdateStatePayload = {
  phase: 'idle',
  currentVersion: app.getVersion(),
};

function log(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.log(`[ODAY Update] ${message}`, detail);
    return;
  }
  console.log(`[ODAY Update] ${message}`);
}

function publicState(): UpdateStatePayload {
  return { ...state, currentVersion: app.getVersion() };
}

function emitState(patch: Partial<UpdateStatePayload>) {
  state = {
    ...state,
    ...patch,
    currentVersion: app.getVersion(),
  };
  const payload = publicState();
  getWindow()?.webContents.send('oday:update:state', payload);
  return payload;
}

function applyOptionalFeedOverride() {
  const override = String(process.env.ODAY_UPDATE_FEED_URL || '').trim().replace(/\/+$/, '');
  if (!override) return;
  log('Using generic update feed override from ODAY_UPDATE_FEED_URL');
  autoUpdater.setFeedURL({ provider: 'generic', url: override });
}

async function runCheck() {
  if (!app.isPackaged || checking) return publicState();
  checking = true;
  try {
    log(`Checking for update (current ${app.getVersion()})`);
    await autoUpdater.checkForUpdates();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('Check failed', message);
    emitState({ phase: 'error', error: message, message: message });
    setTimeout(() => {
      if (state.phase === 'error') emitState({ phase: 'idle', error: undefined, message: undefined });
    }, ERROR_RESET_MS);
  } finally {
    checking = false;
  }
  return publicState();
}

export async function setupAutoUpdater(resolveWindow: () => BrowserWindow | null) {
  getWindow = resolveWindow;

  ipcMain.handle('oday:update:get-state', () => publicState());

  ipcMain.handle('oday:update:check', async () => {
    if (!app.isPackaged) return publicState();
    return runCheck();
  });

  ipcMain.handle('oday:update:sync-server', async () => {
    if (!app.isPackaged) return publicState();
    return runCheck();
  });

  ipcMain.handle('oday:update:install', () => {
    if (!app.isPackaged || state.phase !== 'ready') return false;
    log('Install started');
    try {
      autoUpdater.quitAndInstall(false, true);
      return true;
    } catch (error) {
      log('Install failed', error);
      return false;
    }
  });

  ipcMain.handle('oday:update:dismiss', () => {
    if (state.phase === 'ready') {
      readyDismissed = true;
      readyVersion = state.version || readyVersion;
      emitState({ phase: 'idle', percent: undefined, transferred: undefined, total: undefined });
    }
    return true;
  });

  if (!app.isPackaged) {
    log('Auto-update disabled in development');
    emitState({ phase: 'idle', currentVersion: app.getVersion() });
    return;
  }

  applyOptionalFeedOverride();

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    emitState({ phase: 'checking', error: undefined, message: undefined });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log('No update available', info.version);
    emitState({
      phase: 'idle',
      version: undefined,
      percent: undefined,
      transferred: undefined,
      total: undefined,
    });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log('Update available', info.version);
    if (readyDismissed && info.version === readyVersion) {
      log('User dismissed this version; skipping UI until next release');
      return;
    }
    emitState({
      phase: 'available',
      version: info.version,
      message: `يتوفر إصدار ${info.version}`,
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    emitState({
      phase: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log('Download completed', info.version);
    if (readyDismissed && info.version === readyVersion) {
      log('Download finished for dismissed version; waiting for user action via manual check');
      emitState({ phase: 'idle', version: info.version, percent: 100 });
      return;
    }
    readyDismissed = false;
    readyVersion = info.version;
    emitState({
      phase: 'ready',
      version: info.version,
      percent: 100,
      message: 'التحديث جاهز للتثبيت',
    });
  });

  autoUpdater.on('error', (error: Error) => {
    log('Update error', error.message);
    emitState({ phase: 'error', error: error.message });
    setTimeout(() => {
      if (state.phase === 'error') {
        emitState({ phase: 'idle', error: undefined });
      }
    }, ERROR_RESET_MS);
  });

  setTimeout(() => {
    void runCheck();
  }, 4_000);

  setInterval(() => {
    void runCheck();
  }, CHECK_EVERY_MS);

  powerMonitor.on('resume', () => {
    void runCheck();
  });

  app.on('browser-window-focus', () => {
    const now = Date.now();
    if (now - lastFocusCheck < 60_000) return;
    lastFocusCheck = now;
    void runCheck();
  });
}
