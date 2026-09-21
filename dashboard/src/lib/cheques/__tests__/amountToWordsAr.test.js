import { describe, expect, it } from 'vitest';
import { amountToWordsAr } from '../amountToWordsAr.js';

const ILS_GOLDEN = {
  1: 'شيكل واحد فقط',
  2: 'شيكلان فقط',
  3: 'ثلاثة شواكل فقط',
  11: 'أحد عشر شيكلًا فقط',
  100: 'مائة شيكل فقط',
  1000: 'ألف شيكل فقط',
  2000: 'ألفا شيكل فقط',
  3000: 'ثلاثة آلاف شيكل فقط',
  25000: 'خمسة وعشرون ألف شيكل فقط',
  35500: 'خمسة وثلاثون ألفًا وخمسمائة شيكل فقط',
  100000: 'مائة ألف شيكل فقط',
  1000000: 'مليون شيكل فقط',
  '25000.50': 'خمسة وعشرون ألف شيكل وخمسون أغورة فقط',
};

const CASES = [
  0, 1, 2, 3, 10, 11, 12, 99, 100, 101, 200, 1000, 2000, 3000, 10000, 11000, 25000, 35500, 100000, 1000000, '25000.50',
];

const JOD_EXTRA = ['25000.500', '1.125'];

describe('amountToWordsAr — ILS golden', () => {
  for (const [amount, expected] of Object.entries(ILS_GOLDEN)) {
    it(`ILS ${amount}`, () => {
      expect(amountToWordsAr(amount, 'ILS')).toBe(expected);
    });
  }
});

describe('amountToWordsAr — all currencies case list', () => {
  for (const currency of ['ILS', 'USD', 'JOD']) {
    describe(currency, () => {
      for (const amount of CASES) {
        it(`formats ${amount}`, () => {
          const extra = currency === 'JOD' ? JOD_EXTRA : [];
          const value = amountToWordsAr(amount, currency);
          expect(value.endsWith('فقط')).toBe(true);
          expect(value.length).toBeGreaterThan(3);
        });
      }
      if (currency === 'JOD') {
        for (const amount of JOD_EXTRA) {
          it(`formats JOD ${amount}`, () => {
            expect(amountToWordsAr(amount, 'JOD').endsWith('فقط')).toBe(true);
          });
        }
      }
    });
  }
});

describe('amountToWordsAr — errors', () => {
  it('rejects excessive precision for ILS', () => {
    expect(() => amountToWordsAr('1.234', 'ILS')).toThrow();
  });
  it('rejects huge amounts', () => {
    expect(() => amountToWordsAr('1000000000', 'ILS')).toThrow();
  });
});
