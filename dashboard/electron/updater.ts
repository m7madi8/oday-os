import { app, Notification, ipcMain, net, powerMonitor, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { readStoredKey } from './ipc/store';

const CHECK_EVERY_MS = 5 * 60 * 1000;
const INSTALL_DELAY_MS = 2500;

let checking = false;
let installing = false;
let lastFocusCheck = 0;
let lastMissingFeedNotice = '';

function stripSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isNewerVersion(remote: string, local: string) {
  const a = String(remote || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const b = String(local || '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

function resolveFeedUrl() {
  const fromEnv = stripSlash(String(process.env.ODAY_UPDATE_FEED_URL || '').trim());
  if (fromEnv) return fromEnv;
  const server = stripSlash(readStoredKey('serverUrl') || '');
  if (server) return `${server}/desktop-updates`;
  return '';
}

function applyFeedUrl() {
  const feed = resolveFeedUrl();
  if (!feed) return '';
  autoUpdater.setFeedURL({ provider: 'generic', url: feed });
  return feed;
}

function notify(title: string, body: string, getWindow: () => BrowserWindow | null) {
  const win = getWindow();
  win?.webContents.send('oday:update:status', { title, body });
  if (!Notification.isSupported()) return;
  const toast = new Notification({ title, body, silent: false });
  toast.on('click', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  toast.show();
}

async function fetchSiteVersion(server: string) {
  try {
    const response = await net.fetch(`${stripSlash(server)}/api/oday/desktop/version`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { version?: string };
    return String(payload?.version || '').trim() || null;
  } catch {
    return null;
  }
}

export async function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  async function checkForUpdates() {
    if (!app.isPackaged || checking || installing) return;
    checking = true;
    try {
      const feed = applyFeedUrl();
      const server = stripSlash(readStoredKey('serverUrl') || '');
      const remote = server ? await fetchSiteVersion(server) : null;
      const siteHasNewer = Boolean(remote && isNewerVersion(remote, app.getVersion()));

      let foundInstaller = false;
      if (feed) {
        try {
          const result = await autoUpdater.checkForUpdates();
          foundInstaller = Boolean(
            result?.updateInfo?.version && isNewerVersion(result.updateInfo.version, app.getVersion()),
          );
        } catch {
          foundInstaller = false;
        }
      }
      if (siteHasNewer && !foundInstaller && lastMissingFeedNotice !== remote) {
        lastMissingFeedNotice = remote || '';
        notify(
          'تحديث ODAY OS',
          `الموقع نُشر عليه إصدار ${remote}. انشر مثبّت سطح المكتب في /desktop-updates ليُثبَّت تلقائيًا.`,
          getWindow,
        );
      }
    } catch {
      /* ignore network failures */
    } finally {
      checking = false;
    }
  }

  ipcMain.handle('oday:update:check', async () => {
    await checkForUpdates();
    return true;
  });

  ipcMain.handle('oday:update:sync-server', async () => {
    if (app.isPackaged) applyFeedUrl();
    await checkForUpdates();
    return true;
  });

  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.disableDifferentialDownload = true;

  autoUpdater.on('update-available', (info) => {
    notify(
      'تحديث ODAY OS',
      `يتوفر إصدار ${info.version}. جارٍ التنزيل والتثبيت تلقائيًا.`,
      getWindow,
    );
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (installing) return;
    installing = true;
    notify(
      'تحديث ODAY OS',
      `تم تنزيل الإصدار ${info.version}. سيُعاد تشغيل التطبيق الآن لإتمام التثبيت.`,
      getWindow,
    );
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, true);
      } catch {
        installing = false;
      }
    }, INSTALL_DELAY_MS);
  });

  autoUpdater.on('error', () => {
    /* keep the app usable if the feed is unreachable */
  });

  await checkForUpdates();
  setInterval(() => {
    void checkForUpdates();
  }, CHECK_EVERY_MS);

  powerMonitor.on('resume', () => {
    void checkForUpdates();
  });

  app.on('browser-window-focus', () => {
    const now = Date.now();
    if (now - lastFocusCheck < 60_000) return;
    lastFocusCheck = now;
    void checkForUpdates();
  });
}
