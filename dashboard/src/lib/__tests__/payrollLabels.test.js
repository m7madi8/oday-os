import { describe, expect, it } from 'vitest';
import { currentPeriod, payrollMethodLabel, periodLabel } from '../labels';

describe('payroll labels', () => {
  it('formats a year-month period in Arabic', () => {
    expect(periodLabel('2026-09')).toBe('سبتمبر 2026');
    expect(periodLabel('2026-01')).toBe('يناير 2026');
  });

  it('labels payment methods', () => {
    expect(payrollMethodLabel('cash')).toBe('نقد');
    expect(payrollMethodLabel('transfer')).toBe('تحويل');
    expect(payrollMethodLabel('cheque')).toBe('شيك');
  });

  it('returns current period as YYYY-MM', () => {
    expect(currentPeriod()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });
});
