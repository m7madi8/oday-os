import { AMOUNT_TO_WORDS_MAX_MAJOR, getChequeCurrency } from './currencyConfig.js';

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

const HUNDREDS = {
  1: 'مائة',
  2: 'مائتان',
  3: 'ثلاثمائة',
  4: 'أربعمائة',
  5: 'خمسمائة',
  6: 'ستمائة',
  7: 'سبعمائة',
  8: 'ثمانمائة',
  9: 'تسعمائة',
};

function joinParts(parts) {
  return parts.filter(Boolean).join(' و');
}

/** @param {number} n 1–99 */
function composeUnder100(n) {
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (!ones) return TENS[tens];
  return `${ONES[ones]} و${TENS[tens]}`;
}

/** @param {number} n 1–999 */
function composeUnder1000(n) {
  if (n < 100) return composeUnder100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredWord = HUNDREDS[hundreds];
  if (!rest) return hundredWord;
  return `${hundredWord} و${composeUnder100(rest)}`;
}

function formatThousandsCount(k, accusative) {
  if (k === 1) return 'ألف';
  if (k === 2) return 'ألفا';
  if (k >= 3 && k <= 10) return `${composeUnder100(k)} آلاف`;
  if (k < 100) return `${composeUnder100(k)} ${accusative ? 'ألفًا' : 'ألف'}`;
  return `${composeUnder1000(k)} ${accusative ? 'ألفًا' : 'ألف'}`;
}

function formatMillionsCount(m, accusative) {
  if (m === 1) return 'مليون';
  if (m === 2) return 'مليونان';
  if (m >= 3 && m <= 10) return `${composeUnder100(m)} ملايين`;
  return `${composeUnder1000(m)} ${accusative ? 'مليونًا' : 'مليون'}`;
}

/**
 * @param {number} n positive integer
 * @param {{ singular: string, dual: string, plural: string, accusativeSingular: string }} forms
 */
function formatMajorInteger(n, forms) {
  if (n === 0) return `صفر ${forms.plural}`;
  if (n === 1) return `${forms.singular} واحد`;
  if (n === 2) return forms.dual;

  const millions = Math.floor(n / 1_000_000);
  let rest = n % 1_000_000;
  const thousands = Math.floor(rest / 1000);
  const below1000 = rest % 1000;

  const parts = [];

  if (millions) {
    parts.push(formatMillionsCount(millions, thousands > 0 || below1000 > 0));
  }

  if (thousands) {
    parts.push(formatThousandsCount(thousands, below1000 > 0));
  }

  if (below1000) {
    const hundredsPhrase = composeUnder1000(below1000);
    if (parts.length) {
      return `${joinParts(parts)} و${hundredsPhrase} ${forms.singular}`;
    }
    if (below1000 >= 3 && below1000 <= 10) return `${hundredsPhrase} ${forms.plural}`;
    if (below1000 >= 11 && below1000 < 100) return `${hundredsPhrase} ${forms.accusativeSingular}`;
    return `${hundredsPhrase} ${forms.singular}`;
  }

  if (n >= 3 && n <= 10) return `${composeUnder100(n)} ${forms.plural}`;
  if (n >= 11 && n < 100) return `${composeUnder100(n)} ${forms.accusativeSingular}`;

  if (parts.length) {
    return `${joinParts(parts)} ${forms.singular}`;
  }

  return `${composeUnder1000(n)} ${forms.singular}`;
}

function formatMinorInteger(n, forms) {
  if (n === 0) return '';
  if (n === 1) return `${forms.singular} واحد`;
  if (n === 2) return forms.dual;
  if (n >= 3 && n <= 10) return `${composeUnder100(n)} ${forms.plural}`;
  if (n >= 11 && n < 100) {
    if (n % 10 === 0) return `${composeUnder100(n)} ${forms.singular}`;
    return `${composeUnder100(n)} ${forms.accusativeSingular}`;
  }
  return `${composeUnder1000(n)} ${forms.singular}`;
}

/**
 * @param {string|number} amount decimal string or number
 * @param {string} currencyCode ILS | USD | JOD
 */
export function amountToWordsAr(amount, currencyCode = 'ILS') {
  const currency = getChequeCurrency(currencyCode);
  const normalized = normalizeDecimalInput(amount, currency.precision);
  const negative = normalized.startsWith('-');
  const raw = negative ? normalized.slice(1) : normalized;
  const [majorPart, minorPart = ''] = raw.split('.');
  const major = Number(majorPart || '0');
  const minor = Number(minorPart || '0');

  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    throw new Error('المبلغ غير صالح');
  }
  if (major > AMOUNT_TO_WORDS_MAX_MAJOR) {
    throw new Error('المبلغ أكبر من الحد المسموح للتفقيط');
  }

  let phrase = formatMajorInteger(major, currency.major);
  if (minor > 0) {
    const minorPhrase = formatMinorInteger(minor, currency.minor);
    phrase = `${phrase} و${minorPhrase}`;
  }

  if (negative) phrase = `ناقص ${phrase}`;
  return `${phrase} فقط`;
}

export function normalizeDecimalInput(amount, precision) {
  const raw = String(amount).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error('المبلغ غير صالح');
  }
  const negative = raw.startsWith('-');
  const value = negative ? raw.slice(1) : raw;
  const [whole, frac = ''] = value.split('.');
  if (frac.length > precision) {
    throw new Error('عدد خانات العشرية غير متوافق مع العملة');
  }
  const padded = frac.padEnd(precision, '0').slice(0, precision);
  const combined = precision ? `${whole}.${padded}` : whole;
  return negative ? `-${combined}` : combined;
}
