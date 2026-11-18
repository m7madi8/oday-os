import { describe, expect, it } from 'vitest';
import { parseDecimalAmount } from '../decimalAmount';

describe('parseDecimalAmount', () => {
  it('keeps currency scale without converting through Number', () => {
    expect(parseDecimalAmount('10.10')).toBe('10.10');
    expect(parseDecimalAmount('1234.56')).toBe('1234.56');
    expect(parseDecimalAmount('1.234', 3)).toBe('1.234');
    expect(parseDecimalAmount('1,234')).toBe('1.234');
  });

  it('rejects zero, negative, and extra precision', () => {
    expect(parseDecimalAmount('0')).toBeNull();
    expect(parseDecimalAmount('0.00')).toBeNull();
    expect(parseDecimalAmount('-1.00')).toBeNull();
    expect(parseDecimalAmount('1.234', 2)).toBeNull();
    expect(parseDecimalAmount('')).toBeNull();
  });
});
