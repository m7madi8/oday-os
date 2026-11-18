import { describe, expect, it } from 'vitest';
import { shouldEndSession } from './sessionEnd';

describe('mobile session ending', () => {
  it('ends the session for an invalid token and a real 401', () => {
    expect(shouldEndSession(403, { message: 'Invalid token' })).toBe(true);
    expect(shouldEndSession(401, { error: 'Unauthenticated.' })).toBe(true);
  });

  it('keeps the session for a permission refusal', () => {
    expect(shouldEndSession(403, { message: 'لا صلاحية لإدارة النسخ الاحتياطي' })).toBe(false);
    expect(shouldEndSession(401, { message: 'This action is unauthorized.' })).toBe(false);
  });
});
