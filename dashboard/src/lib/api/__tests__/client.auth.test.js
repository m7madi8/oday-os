import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../client';
import * as session from '../../auth/session';

vi.mock('../../env', () => ({
  getApiRoot: () => 'http://api.test',
}));

vi.mock('../../desktop', () => ({
  isDesktop: () => false,
  getDesktop: () => null,
}));

describe('api client auth errors', () => {
  beforeEach(() => {
    vi.spyOn(session, 'clearSession').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockResponse(status, body = { message: 'unauthorized' }) {
    return {
      ok: false,
      status,
      headers: {
        get: (name) => (name === 'content-type' ? 'application/json' : ''),
      },
      json: async () => body,
    };
  }

  it('throws on 401 when a token was sent (does not return empty success)', async () => {
    vi.spyOn(session, 'getToken').mockResolvedValue('local:oday');
    global.fetch = vi.fn().mockResolvedValue(mockResponse(401));

    await expect(api('/api/v1/cheques')).rejects.toBeInstanceOf(ApiError);
    expect(session.clearSession).toHaveBeenCalled();
  });

  it('throws on 401 for real tokens', async () => {
    vi.spyOn(session, 'getToken').mockResolvedValue('server-issued-token');
    global.fetch = vi.fn().mockResolvedValue(mockResponse(401));

    await expect(api('/api/v1/invoices')).rejects.toMatchObject({ status: 401 });
    expect(session.clearSession).toHaveBeenCalled();
  });

  it('throws on 403 for authenticated requests', async () => {
    vi.spyOn(session, 'getToken').mockResolvedValue('server-issued-token');
    global.fetch = vi.fn().mockResolvedValue(mockResponse(403, { message: 'Forbidden' }));

    await expect(api('/api/v1/cheques', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
    expect(session.clearSession).not.toHaveBeenCalled();
  });

  it('ends the session on an invalid token 403', async () => {
    vi.spyOn(session, 'getToken').mockResolvedValue('server-issued-token');
    global.fetch = vi.fn().mockResolvedValue(mockResponse(403, { message: 'Invalid token' }));

    await expect(api('/api/v1/reports/office-summary')).rejects.toMatchObject({ status: 403 });
    expect(session.clearSession).toHaveBeenCalled();
  });

  it('keeps the session when cheque authorization returns 401', async () => {
    vi.spyOn(session, 'getToken').mockResolvedValue('server-issued-token');
    global.fetch = vi.fn().mockResolvedValue(mockResponse(401, { message: 'This action is unauthorized.' }));

    await expect(api('/api/v1/cheques/1/transition', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 401,
      message: 'This action is unauthorized.',
    });
    expect(session.clearSession).not.toHaveBeenCalled();
  });
});
