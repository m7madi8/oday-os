import { describe, expect, it } from 'vitest';
import { safePdfFileName } from './printName';

describe('print file names', () => {
  it('drops path traversal from a print name', () => {
    expect(safePdfFileName('..\\..\\Windows\\evil.pdf', 1)).toBe('evil.pdf');
    expect(safePdfFileName('../../tmp/evil.pdf', 1)).toBe('evil.pdf');
  });

  it('uses a generated name when the requested name is empty', () => {
    expect(safePdfFileName('', 5)).toBe('oday-5.pdf');
  });
});
