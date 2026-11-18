import { describe, expect, it } from 'vitest';
import { parseDecimalAmount } from './decimalAmount';

describe('parseDecimalAmount', () => {
  it('preserves decimal strings', () => {
    expect(parseDecimalAmount('10.10')).toBe('10.10');
    expect(parseDecimalAmount('1234.56')).toBe('1234.56');
    expect(parseDecimalAmount('1.234')).toBe('1.234');
  });

  it('rejects invalid amounts', () => {
    expect(parseDecimalAmount('0')).toBeNull();
    expect(parseDecimalAmount('-5')).toBeNull();
    expect(parseDecimalAmount('1.2345678')).toBeNull();
  });
});
