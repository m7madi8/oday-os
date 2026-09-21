import { palestinianBanks } from '../../data/palestinianBanks.js';

/**
 * @param {string} query
 * @param {import('../../data/palestinianBanks.js').PalestinianBank[]} [banks]
 */
export function searchPalestinianBanks(query, banks = palestinianBanks) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return banks.slice();

  return banks.filter((bank) => {
    const haystack = [
      bank.nameAr,
      bank.nameEn,
      bank.iban4LetterCode,
      bank.bic,
      bank.localCode,
      bank.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function verifiedBanks(banks = palestinianBanks) {
  return banks.filter((bank) => bank.verified);
}
