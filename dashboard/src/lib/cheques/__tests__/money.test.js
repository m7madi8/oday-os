import { describe, expect, it } from 'vitest';
import {
  formatDecimalDisplay,
  formatMinorToDecimal,
  parseMoneyToMinor,
} from '../money.js';

describe('money helpers', () => {
  it('parses ILS without floats', () => {
    expect(parseMoneyToMinor('12.34', 'ILS')).toBe(1234n);
    expect(parseMoneyToMinor('1,234.56', 'ILS')).toBe(123456n);
  });

  it('parses JOD with 3 decimals', () => {
    expect(parseMoneyToMinor('10.500', 'JOD')).toBe(10500n);
    expect(formatMinorToDecimal(10500n, 'JOD')).toBe('10.500');
  });

  it('formats display with western digits and symbol', () => {
    expect(formatDecimalDisplay('25000.5', 'ILS')).toBe('₪25,000.50');
  });

  it('rejects excess JOD precision', () => {
    expect(() => parseMoneyToMinor('1.1234', 'JOD')).toThrow();
  });
});
