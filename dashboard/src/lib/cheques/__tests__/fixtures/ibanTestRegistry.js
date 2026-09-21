/**
 * Test-only bank registry — NOT used in production UI.
 */

/** @type {import('../../../../data/palestinianBanks.js').PalestinianBank} */
export const ibanTestFixtureBank = {
  id: 'test-fixture-bank',
  nameAr: 'بنك اختبار',
  nameEn: 'Test Fixture Bank',
  iban4LetterCode: 'ZZZZ',
  bic: null,
  localCode: null,
  logo: null,
  verified: true,
  source: 'unit-test-fixture-only',
};

/** MOD-97 valid Palestinian IBAN for ZZZZ (test fixture). */
export const IBAN_TEST_FIXTURE_VALID = 'PS31ZZZZ000000000000000000001';

/** Official registry example (Bank of Palestine / PALS). */
export const IBAN_PMA_PALS_EXAMPLE = 'PS92PALS000000000400123456702';
