import { describe, expect, it } from 'vitest';
import { palestinianBanks } from '../../../data/palestinianBanks.js';
import {
  IBAN_STATUS,
  analyzePalestinianIban,
  identifyBankFromChequeNumber,
  normalizeIban,
} from '../iban.js';
import {
  IBAN_PMA_PALS_EXAMPLE,
  IBAN_TEST_FIXTURE_VALID,
  ibanTestFixtureBank,
} from './fixtures/ibanTestRegistry.js';

describe('IBAN — Palestine', () => {
  it('normalizes spaces and case', () => {
    expect(normalizeIban('ps92 pals 0000 0000 0400 1234 5670 2')).toBe(IBAN_PMA_PALS_EXAMPLE);
  });

  it('invalid length identifies no bank', () => {
    const result = analyzePalestinianIban('PS92PALS123');
    expect(result.status).toBe(IBAN_STATUS.INVALID);
    expect(result.bank).toBeNull();
    expect(result.reason).toBe('بيانات IBAN غير صالحة');
  });

  it('invalid characters identifies no bank', () => {
    const result = analyzePalestinianIban('PS92PAL$000000000400123456702');
    expect(result.status).toBe(IBAN_STATUS.INVALID);
    expect(result.bank).toBeNull();
  });

  it('bad checksum identifies no bank', () => {
    const result = analyzePalestinianIban('PS00PALS000000000400123456702');
    expect(result.status).toBe(IBAN_STATUS.INVALID);
    expect(result.bank).toBeNull();
  });

  it('valid checksum with unknown bank code returns choose bank', () => {
    const registry = palestinianBanks.filter((b) => !b.verified);
    const result = analyzePalestinianIban(IBAN_TEST_FIXTURE_VALID, registry);
    expect(result.status).toBe(IBAN_STATUS.VALID_UNMATCHED);
    expect(result.reason).toBe('اختر البنك');
    expect(result.bank).toBeNull();
  });

  it('valid verified IBAN identifies bank (PMA PALS example)', () => {
    const result = analyzePalestinianIban(IBAN_PMA_PALS_EXAMPLE);
    expect(result.status).toBe(IBAN_STATUS.VALID_MATCHED);
    expect(result.bank?.id).toBe('bank-of-palestine');
  });

  it('test fixture registry matches ZZZZ IBAN', () => {
    const registry = [...palestinianBanks, ibanTestFixtureBank];
    const result = analyzePalestinianIban(IBAN_TEST_FIXTURE_VALID, registry);
    expect(result.status).toBe(IBAN_STATUS.VALID_MATCHED);
    expect(result.bank?.id).toBe('test-fixture-bank');
  });

  it('cheque number alone never identifies a bank', () => {
    const result = identifyBankFromChequeNumber('400123456702');
    expect(result.bank).toBeNull();
    expect(result.status).toBe(IBAN_STATUS.INVALID);
  });
});
