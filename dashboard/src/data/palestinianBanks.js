/**
 * Palestinian banks dataset — identifiers only when verified from an official source.
 * @see https://www.pma.ps (Palestine Monetary Authority)
 */

export const PALESTINIAN_IBAN_LENGTH = 29;
export const PALESTINIAN_IBAN_COUNTRY = 'PS';

/**
 * @typedef {Object} PalestinianBank
 * @property {string} id
 * @property {string} nameAr
 * @property {string} nameEn
 * @property {string|null} iban4LetterCode SWIFT/BIC bank code in IBAN positions 5–8
 * @property {string|null} bic
 * @property {string|null} localCode
 * @property {string|null} logo
 * @property {boolean} verified
 * @property {string|null} source
 */

/** @type {PalestinianBank[]} */
export const palestinianBanks = [
  {
    id: 'bank-of-palestine',
    nameAr: 'بنك فلسطين',
    nameEn: 'Bank of Palestine',
    iban4LetterCode: 'PALS',
    bic: null,
    localCode: null,
    logo: null,
    verified: true,
    source: 'PMA IBAN documentation — bank code PALS in positions 5–8 (example structure PS##PALS000000000000123456789)',
  },
  {
    id: 'palestine-islamic-bank',
    nameAr: 'البنك الإسلامي الفلسطيني',
    nameEn: 'Palestine Islamic Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'arab-islamic-bank',
    nameAr: 'البنك العربي الإسلامي',
    nameEn: 'Arab Islamic Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'quds-bank',
    nameAr: 'بنك القدس',
    nameEn: 'Quds Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'cairo-amman-bank',
    nameAr: 'بنك القاهرة عمان',
    nameEn: 'Cairo Amman Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'arab-bank',
    nameAr: 'البنك العربي',
    nameEn: 'Arab Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'bank-of-jordan',
    nameAr: 'بنك الأردن',
    nameEn: 'Bank of Jordan',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'jordan-ahli-bank',
    nameAr: 'البنك الأهلي الأردني',
    nameEn: 'Jordan Ahli Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'jordan-commercial-bank',
    nameAr: 'البنك التجاري الأردني',
    nameEn: 'Jordan Commercial Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'housing-bank',
    nameAr: 'بنك الإسكان للتجارة والتمويل',
    nameEn: 'Housing Bank for Trade and Finance',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'national-bank',
    nameAr: 'البنك الوطني',
    nameEn: 'The National Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'palestine-investment-bank',
    nameAr: 'بنك الاستثمار الفلسطيني',
    nameEn: 'Palestine Investment Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'palestine-commercial-bank',
    nameAr: 'البنك التجاري الفلسطيني',
    nameEn: 'Palestine Commercial Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
  {
    id: 'safa-bank',
    nameAr: 'بنك صفا',
    nameEn: 'Safa Bank',
    iban4LetterCode: null,
    bic: null,
    localCode: null,
    logo: null,
    verified: false,
    source: null,
  },
];
