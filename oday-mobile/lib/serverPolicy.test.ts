import { describe, expect, it } from 'vitest';
import { acceptServerUrl, resolveApiUrl } from './serverPolicy';

describe('mobile API URL policy', () => {
  it('does not fall back to localhost in production', () => {
    expect(
      resolveApiUrl({
        stage: 'production',
        stored: '',
        envUrl: '',
        allowDevelopmentFallback: false,
      }),
    ).toBe('');
  });

  it('rejects a production HTTP or loopback URL', () => {
    expect(acceptServerUrl('production', 'http://203.0.113.10')).toBe('');
    expect(acceptServerUrl('production', 'https://127.0.0.1')).toBe('');
    expect(acceptServerUrl('production', 'https://office.example')).toBe('https://office.example');
  });

  it('uses an explicit production HTTPS URL', () => {
    expect(
      resolveApiUrl({
        stage: 'production',
        stored: 'https://office.example',
        envUrl: '',
        allowDevelopmentFallback: false,
      }),
    ).toBe('https://office.example');
  });

  it('does not use loopback for a preview build without a configured URL', () => {
    expect(
      resolveApiUrl({
        stage: 'preview',
        stored: '',
        envUrl: 'http://127.0.0.1:8000',
        allowDevelopmentFallback: false,
      }),
    ).toBe('');
  });

  it('keeps the development localhost fallback', () => {
    expect(
      resolveApiUrl({
        stage: 'development',
        stored: '',
        envUrl: '',
        allowDevelopmentFallback: true,
      }),
    ).toBe('http://127.0.0.1:8000');
  });
});