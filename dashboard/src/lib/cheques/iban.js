import {
  PALESTINIAN_IBAN_COUNTRY,
  PALESTINIAN_IBAN_LENGTH,
  palestinianBanks,
} from '../../data/palestinianBanks.js';
import { verifiedBanks } from './bankSearch.js';

export const IBAN_STATUS = {
  INVALID: 'invalid',
  VALID_UNMATCHED: 'valid_unmatched',
  VALID_MATCHED: 'valid_matched',
};

const INVALID_MESSAGE = 'بيانات IBAN غير صالحة';
const CHOOSE_BANK_MESSAGE = 'اختر البنك';

/**
 * @param {string} iban
 */
export function normalizeIban(iban) {
  return String(iban || '').replace(/\s+/g, '').toUpperCase();
}

function expandIban(iban) {
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let expanded = '';
  for (const ch of rearranged) {
    if (ch >= 'A' && ch <= 'Z') {
      expanded += String(ch.charCodeAt(0) - 55);
    } else {
      expanded += ch;
    }
  }
  return expanded;
}

function mod97(bigNumericString) {
  let remainder = 0;
  for (let i = 0; i < bigNumericString.length; i += 7) {
    const block = String(remainder) + bigNumericString.slice(i, i + 7);
    remainder = Number(BigInt(block) % 97n);
  }
  return remainder;
}

export function isValidPalestinianIbanChecksum(iban) {
  return mod97(expandIban(iban)) === 1;
}

/**
 * @param {string} iban
 * @param {import('../../data/palestinianBanks.js').PalestinianBank[]} [registry]
 */
export function analyzePalestinianIban(iban, registry = palestinianBanks) {
  const normalized = normalizeIban(iban);

  if (!normalized) {
    return { status: IBAN_STATUS.INVALID, reason: INVALID_MESSAGE, bank: null, bankCode: null };
  }

  if (!normalized.startsWith(PALESTINIAN_IBAN_COUNTRY)) {
    return { status: IBAN_STATUS.INVALID, reason: INVALID_MESSAGE, bank: null, bankCode: null };
  }

  if (normalized.length !== PALESTINIAN_IBAN_LENGTH) {
    return { status: IBAN_STATUS.INVALID, reason: INVALID_MESSAGE, bank: null, bankCode: null };
  }

  if (!/^PS[0-9]{2}[A-Z]{4}[0-9A-Z]{21}$/.test(normalized)) {
    return { status: IBAN_STATUS.INVALID, reason: INVALID_MESSAGE, bank: null, bankCode: null };
  }

  if (!isValidPalestinianIbanChecksum(normalized)) {
    return { status: IBAN_STATUS.INVALID, reason: INVALID_MESSAGE, bank: null, bankCode: null };
  }

  const bankCode = normalized.slice(4, 8);
  const match = verifiedBanks(registry).find((bank) => bank.iban4LetterCode === bankCode) || null;

  if (!match) {
    return {
      status: IBAN_STATUS.VALID_UNMATCHED,
      reason: CHOOSE_BANK_MESSAGE,
      bank: null,
      bankCode,
    };
  }

  return {
    status: IBAN_STATUS.VALID_MATCHED,
    reason: null,
    bank: match,
    bankCode,
  };
}

/**
 * Cheque numbers must never identify a bank.
 */
export function identifyBankFromChequeNumber() {
  return {
    status: IBAN_STATUS.INVALID,
    reason: INVALID_MESSAGE,
    bank: null,
    bankCode: null,
  };
}
