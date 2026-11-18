import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getToken, loadSession, saveSession } from './session';

describe('desktop session without disk encryption', () => {
  beforeEach(async () => {
    await clearSession();
    window.oday = {
      store: {
        async set() {
          return false;
        },
        async get() {
          return null;
        },
        async delete() {
          return true;
        },
      },
    };
  });

  it('keeps the current session in memory when the vault refuses to persist it', async () => {
    await saveSession({
      token: 'memory-token',
      user: { id: 1 },
      company: { id: 2 },
    });
    expect(await getToken()).toBe('memory-token');
    expect((await loadSession()).token).toBe('memory-token');
  });

  it('logout removes the in-memory session', async () => {
    await saveSession({
      token: 'memory-token',
      user: { id: 1 },
      company: { id: 2 },
    });
    await clearSession();
    expect(await getToken()).toBeNull();
    expect(await loadSession()).toBeNull();
  });
});
