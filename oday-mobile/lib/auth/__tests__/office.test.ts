import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isOfficeLogin,
  tryLocalOfficeSession,
  isLocalOfficeLoginEnabled,
  isLocalToken,
} from '../office';

describe('mobile office local login gate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_APP_ENV;
  });

  it('blocks oday/oday when __DEV__ is false (production)', () => {
    vi.stubGlobal('__DEV__', false);
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    expect(isLocalOfficeLoginEnabled()).toBe(false);
    expect(isOfficeLogin('oday', 'oday')).toBe(false);
    expect(tryLocalOfficeSession('oday', 'oday')).toBe(null);
  });

  it('blocks oday/oday when EXPO_PUBLIC_APP_ENV is production even in __DEV__', () => {
    vi.stubGlobal('__DEV__', true);
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    expect(isLocalOfficeLoginEnabled()).toBe(false);
    expect(isOfficeLogin('oday', 'oday')).toBe(false);
  });

  it('allows oday/oday in development when __DEV__ and not production env', () => {
    vi.stubGlobal('__DEV__', true);
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    expect(isLocalOfficeLoginEnabled()).toBe(true);
    expect(isOfficeLogin('oday', 'oday')).toBe(true);
    expect(tryLocalOfficeSession('oday', 'oday')?.token).toBe('local:oday');
  });

  it('detects local tokens', () => {
    expect(isLocalToken('local:oday')).toBe(true);
    expect(isLocalToken('token')).toBe(false);
  });
});
