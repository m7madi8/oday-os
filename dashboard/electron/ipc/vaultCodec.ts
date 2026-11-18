export const CREDENTIAL_KEYS = new Set(['token', 'user', 'company']);
export const ALLOWED_KEYS = new Set(['token', 'user', 'company', 'serverUrl', 'dashboardUrl']);

const MAX_VALUE_LENGTH = 200_000;

export function isCredentialKey(key: string) {
  return CREDENTIAL_KEYS.has(key);
}

export function isAllowedKey(key: string) {
  return ALLOWED_KEYS.has(key);
}

export type StoragePlan =
  | { ok: false }
  | { ok: true; mode: 'encrypt'; value: string }
  | { ok: true; mode: 'config'; stored: string };

/**
 * Credentials are encrypted or not written.
 * Server addresses may use a separate config prefix only when OS encryption is unavailable.
 * The `plain:` prefix is never produced.
 */
export function planStorage(key: string, value: string, encryptionAvailable: boolean): StoragePlan {
  if (!isAllowedKey(key) || typeof value !== 'string') return { ok: false };
  if (value.length === 0 || value.length > MAX_VALUE_LENGTH) return { ok: false };
  if (isCredentialKey(key)) {
    if (!encryptionAvailable) return { ok: false };
    return { ok: true, mode: 'encrypt', value };
  }
  if (encryptionAvailable) return { ok: true, mode: 'encrypt', value };
  return {
    ok: true,
    mode: 'config',
    stored: `cfg:${Buffer.from(value, 'utf8').toString('base64')}`,
  };
}

export type StoredReading =
  | { action: 'missing' }
  | { action: 'purge' }
  | { action: 'encrypted'; payload: string }
  | { action: 'config'; value: string };

/** `plain:` values are discarded. They are not returned to the caller. */
export function readStoredValue(key: string, encoded: string | undefined): StoredReading {
  if (!encoded) return { action: 'missing' };
  if (!isAllowedKey(key)) return { action: 'purge' };
  if (encoded.startsWith('plain:')) return { action: 'purge' };
  if (encoded.startsWith('enc:')) {
    const payload = encoded.slice(4);
    if (!payload) return { action: 'purge' };
    return { action: 'encrypted', payload };
  }
  if (encoded.startsWith('cfg:')) {
    if (isCredentialKey(key)) return { action: 'purge' };
    try {
      const value = Buffer.from(encoded.slice(4), 'base64').toString('utf8');
      if (!value) return { action: 'purge' };
      return { action: 'config', value };
    } catch {
      return { action: 'purge' };
    }
  }
  return { action: 'purge' };
}
