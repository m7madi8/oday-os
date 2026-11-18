import { app, ipcMain, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isAllowedKey, planStorage, readStoredValue } from './vaultCodec';

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

function encryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function encryptValue(value: string) {
  return `enc:${safeStorage.encryptString(value).toString('base64')}`;
}

function decryptValue(payload: string) {
  return safeStorage.decryptString(Buffer.from(payload, 'base64'));
}

function trustedSender(event: IpcMainInvokeEvent) {
  const url = event.senderFrame?.url || '';
  return (
    url.startsWith('oday://') ||
    url.startsWith('file://') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  );
}

function purge(vault: Vault, key: string) {
  if (!(key in vault)) return;
  delete vault[key];
  writeVault(vault);
}

export function readStoredKey(key: string): string | null {
  if (!isAllowedKey(key)) return null;
  const vault = readVault();
  const reading = readStoredValue(key, vault[key]);
  if (reading.action === 'missing') return null;
  if (reading.action === 'purge') {
    purge(vault, key);
    return null;
  }
  if (reading.action === 'config') return reading.value;
  try {
    return decryptValue(reading.payload);
  } catch {
    purge(vault, key);
    return null;
  }
}

function writeStoredKey(key: string, value: string) {
  const plan = planStorage(key, value, encryptionAvailable());
  if (!plan.ok) return false;
  const vault = readVault();
  vault[key] = plan.mode === 'encrypt' ? encryptValue(plan.value) : plan.stored;
  writeVault(vault);
  return true;
}

export function registerStoreIpc() {
  ipcMain.handle('oday:store:get', (event, key: string) => {
    if (!trustedSender(event) || typeof key !== 'string') return null;
    return readStoredKey(key);
  });

  ipcMain.handle('oday:store:set', (event, key: string, value: string) => {
    if (!trustedSender(event) || typeof key !== 'string' || typeof value !== 'string') return false;
    return writeStoredKey(key, value);
  });

  ipcMain.handle('oday:store:delete', (event, key: string) => {
    if (!trustedSender(event) || typeof key !== 'string' || !isAllowedKey(key)) return false;
    const vault = readVault();
    delete vault[key];
    writeVault(vault);
    return true;
  });
}
