import { app, ipcMain, safeStorage } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ALLOWED_KEYS = new Set(['token', 'user', 'company', 'serverUrl', 'dashboardUrl']);

type Vault = Record<string, string>;

function vaultPath() {
  const dir = app.getPath('userData');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'oday-secure.json');
}

function readVault(): Vault {
  try {
    const raw = readFileSync(vaultPath(), 'utf8');
    const parsed = JSON.parse(raw) as Vault;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeVault(vault: Vault) {
  writeFileSync(vaultPath(), JSON.stringify(vault), { encoding: 'utf8', mode: 0o600 });
}

function encrypt(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `enc:${safeStorage.encryptString(value).toString('base64')}`;
  }
  return `plain:${Buffer.from(value, 'utf8').toString('base64')}`;
}

function decrypt(value: string): string {
  if (value.startsWith('enc:')) {
    return safeStorage.decryptString(Buffer.from(value.slice(4), 'base64'));
  }
  if (value.startsWith('plain:')) {
    return Buffer.from(value.slice(6), 'base64').toString('utf8');
  }
  return value;
}

export function readStoredKey(key: string): string | null {
  if (!ALLOWED_KEYS.has(key)) return null;
  const encoded = readVault()[key];
  if (!encoded) return null;
  try {
    return decrypt(encoded);
  } catch {
    return null;
  }
}

export function registerStoreIpc() {
  ipcMain.handle('oday:store:get', (_event, key: string) => {
    if (!ALLOWED_KEYS.has(key)) return null;
    const encoded = readVault()[key];
    if (!encoded) return null;
    try {
      return decrypt(encoded);
    } catch {
      return null;
    }
  });

  ipcMain.handle('oday:store:set', (_event, key: string, value: string) => {
    if (!ALLOWED_KEYS.has(key)) return false;
    if (typeof value !== 'string') return false;
    const vault = readVault();
    vault[key] = encrypt(value);
    writeVault(vault);
    return true;
  });

  ipcMain.handle('oday:store:delete', (_event, key: string) => {
    if (!ALLOWED_KEYS.has(key)) return false;
    const vault = readVault();
    delete vault[key];
    writeVault(vault);
    return true;
  });
}
