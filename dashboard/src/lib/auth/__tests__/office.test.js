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

  it('allows oday/oday in development and production builds', () => {
    import.meta.env.DEV = true;
    expect(isLocalOfficeLoginEnabled()).toBe(true);
    expect(isOfficeLogin('oday', 'oday')).toBe(true);
    expect(tryLocalOfficeSession('oday', 'oday')?.token).toBe('local:oday');

    import.meta.env.DEV = false;
    expect(isLocalOfficeLoginEnabled()).toBe(true);
    expect(isOfficeLogin('oday', 'oday')).toBe(true);
    expect(tryLocalOfficeSession('oday', 'oday')?.token).toBe('local:oday');
  });

  it('detects local tokens', () => {
    expect(isLocalToken('local:oday')).toBe(true);
    expect(isLocalToken('abc')).toBe(false);
  });
});
