import { describe, it, expect, afterEach } from 'vitest';
import {
  isOfficeLogin,
  tryLocalOfficeSession,
  isLocalToken,
  isLocalOfficeLoginEnabled,
} from '../office';

describe('office local login gate', () => {
  const previousDev = import.meta.env.DEV;

  afterEach(() => {
    import.meta.env.DEV = previousDev;
  });

  it('allows oday/oday only when import.meta.env.DEV is true', () => {
    import.meta.env.DEV = true;
    expect(isLocalOfficeLoginEnabled()).toBe(true);
    expect(isOfficeLogin('oday', 'oday')).toBe(true);
    expect(tryLocalOfficeSession('oday', 'oday')?.token).toBe('local:oday');
  });

  it('blocks oday/oday in production builds (DEV false)', () => {
    import.meta.env.DEV = false;
    expect(isLocalOfficeLoginEnabled()).toBe(false);
    expect(isOfficeLogin('oday', 'oday')).toBe(false);
    expect(tryLocalOfficeSession('oday', 'oday')).toBe(null);
  });

  it('detects local tokens', () => {
    expect(isLocalToken('local:oday')).toBe(true);
    expect(isLocalToken('abc')).toBe(false);
  });
});
