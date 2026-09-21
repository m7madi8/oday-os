import { getChequeCurrency } from './currencyConfig.js';

const FACTORS = { ILS: 100, USD: 100, JOD: 1000 };

export function currencyFactor(code) {
  const currency = getChequeCurrency(code);
  return 10 ** currency.precision;
}

/**
 * Parse user decimal input to minor units (integer) without floats.
 * @param {string|number} input
 * @param {string} currencyCode
 */
export function parseMoneyToMinor(input, currencyCode = 'ILS') {
  const currency = getChequeCurrency(currencyCode);
  const raw = String(input).trim().replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error('المبلغ غير صالح');
  }
  const negative = raw.startsWith('-');
  const value = negative ? raw.slice(1) : raw;
  const [whole, frac = ''] = value.split('.');
  if (frac.length > currency.precision) {
    throw new Error('عدد خانات العشرية غير متوافق مع العملة');
  }
  const padded = frac.padEnd(currency.precision, '0').slice(0, currency.precision);
  const minor = BigInt(whole) * BigInt(currencyFactor(currencyCode)) + BigInt(padded || '0');
  return negative ? -minor : minor;
}

/**
 * @param {bigint|number|string} minor
 * @param {string} currencyCode
 */
export function formatMinorToDecimal(minor, currencyCode = 'ILS') {
  const currency = getChequeCurrency(currencyCode);
  const factor = BigInt(currencyFactor(currencyCode));
  let value = typeof minor === 'bigint' ? minor : BigInt(String(minor));
  const negative = value < 0n;
  if (negative) value = -value;
  const whole = value / factor;
  const frac = value % factor;
  const fracStr = frac.toString().padStart(currency.precision, '0');
  const decimal = currency.precision ? `${whole}.${fracStr}` : String(whole);
  return negative ? `-${decimal}` : decimal;
}

/**
 * Tabular-friendly Western digits with thousands separators.
 */
export function formatMoneyDisplay(minor, currencyCode = 'ILS', { hidden = false } = {}) {
  const currency = getChequeCurrency(currencyCode);
  if (hidden) return `${currency.symbol} ••••`;
  const decimal = formatMinorToDecimal(minor, currencyCode);
  const negative = decimal.startsWith('-');
  const [whole, frac = ''] = (negative ? decimal.slice(1) : decimal).split('.');
  const grouped = Number(whole).toLocaleString('en-US');
  const body = currency.precision ? `${grouped}.${frac.padEnd(currency.precision, '0')}` : grouped;
  return `${negative ? '-' : ''}${currency.symbol}${body}`;
}

export function formatDecimalDisplay(amount, currencyCode = 'ILS', options) {
  const minor = parseMoneyToMinor(amount, currencyCode);
  return formatMoneyDisplay(minor, currencyCode, options);
}

export function currencyLabel(code, locale = 'ar') {
  const currency = getChequeCurrency(code);
  return locale === 'en' ? currency.labelEn : currency.labelAr;
}

export function currencySymbol(code) {
  return getChequeCurrency(code).symbol;
}

export { FACTORS };
