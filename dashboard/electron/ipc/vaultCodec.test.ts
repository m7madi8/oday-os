import { describe, expect, it } from 'vitest';
import { planStorage, readStoredValue } from './vaultCodec';

describe('vault credential storage', () => {
  it('does not write a token when encryption is unavailable', () => {
    const plan = planStorage('token', 'secret-token', false);
    expect(plan.ok).toBe(false);
  });

  it('plans encrypted storage for a token when encryption is available', () => {
    const plan = planStorage('token', 'secret-token', true);
    expect(plan).toEqual({ ok: true, mode: 'encrypt', value: 'secret-token' });
  });

  it('never emits the plain prefix', () => {
    const credential = planStorage('user', '{"id":1}', false);
    const config = planStorage('serverUrl', 'https://office.example', false);
    expect(credential.ok).toBe(false);
    expect(config.ok).toBe(true);
    if (config.ok && config.mode === 'config') {
      expect(config.stored.startsWith('plain:')).toBe(false);
      expect(config.stored.startsWith('cfg:')).toBe(true);
    }
  });

  it('purges a legacy plain credential instead of returning it', () => {
    const encoded = `plain:${Buffer.from('secret-token', 'utf8').toString('base64')}`;
    expect(readStoredValue('token', encoded)).toEqual({ action: 'purge' });
  });

  it('rejects a credential stored with the config prefix', () => {
    const encoded = `cfg:${Buffer.from('secret-token', 'utf8').toString('base64')}`;
    expect(readStoredValue('token', encoded)).toEqual({ action: 'purge' });
  });

  it('reads a non-secret server address saved without encryption', () => {
    const plan = planStorage('serverUrl', 'https://office.example', false);
    expect(plan.ok).toBe(true);
    if (!plan.ok || plan.mode !== 'config') return;
    expect(readStoredValue('serverUrl', plan.stored)).toEqual({
      action: 'config',
      value: 'https://office.example',
    });
  });

  it('rejects keys outside the allowlist', () => {
    expect(planStorage('password', 'x', true).ok).toBe(false);
    expect(readStoredValue('password', 'enc:abc')).toEqual({ action: 'purge' });
  });
});
