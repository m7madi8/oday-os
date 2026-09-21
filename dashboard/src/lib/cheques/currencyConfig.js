/**
 * Currency morphology for Arabic amount-to-words (forms only — logic lives in amountToWordsAr).
 */

export const CHEQUE_CURRENCIES = {
  ILS: {
    code: 'ILS',
    precision: 2,
    symbol: '₪',
    labelAr: 'شيكل',
    labelEn: 'ILS',
    major: {
      singular: 'شيكل',
      dual: 'شيكلان',
      plural: 'شواكل',
      accusativeSingular: 'شيكلًا',
    },
    minor: {
      singular: 'أغورة',
      dual: 'أغورتان',
      plural: 'أغورات',
      accusativeSingular: 'أغورةً',
    },
  },
  USD: {
    code: 'USD',
    precision: 2,
    symbol: '$',
    labelAr: 'دولار',
    labelEn: 'USD',
    major: {
      singular: 'دولار',
      dual: 'دولاران',
      plural: 'دولارات',
      accusativeSingular: 'دولارًا',
    },
    minor: {
      singular: 'سنت',
      dual: 'سنتان',
      plural: 'سنتات',
      accusativeSingular: 'سنتًا',
    },
  },
  JOD: {
    code: 'JOD',
    precision: 3,
    symbol: 'د.أ',
    labelAr: 'دينار',
    labelEn: 'JOD',
    major: {
      singular: 'دينار',
      dual: 'ديناران',
      plural: 'دينات',
      accusativeSingular: 'دينارًا',
    },
    minor: {
      singular: 'فلس',
      dual: 'فلسان',
      plural: 'فلوس',
      accusativeSingular: 'فلسًا',
    },
  },
};

export const AMOUNT_TO_WORDS_MAX_MAJOR = 999_999_999;

export function getChequeCurrency(code) {
  const key = String(code || 'ILS').toUpperCase();
  const currency = CHEQUE_CURRENCIES[key];
  if (!currency) {
    throw new Error(`عملة غير مدعومة: ${key}`);
  }
  return currency;
}
