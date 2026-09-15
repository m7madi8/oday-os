import { applyPalette, setAppCurrency } from '../theme';
import { fetchOfficeSettings, saveOfficeSettingsApi } from './api/office';
import { BRAND } from '../brand';

export const OFFICE_KEY = 'office-settings';

export const COUNTRY_CODES = [
  { code: '+970', label: 'فلسطين +970' },
  { code: '+962', label: 'الأردن +962' },
  { code: '+966', label: 'السعودية +966' },
  { code: '+971', label: 'الإمارات +971' },
  { code: '+20', label: 'مصر +20' },
  { code: '+1', label: 'الولايات المتحدة +1' },
];

export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const DEFAULT_OFFICE_SETTINGS = {
  officeName: BRAND.owner,
  language: 'ar',
  countryCode: '+970',
  phone: '',
  email: '',
  tagline: BRAND.tagline,
  address: '',
  whatsapp: '',
  website: '',
  bankAccount: '',
  bankName: '',
  beneficiary: BRAND.firmAr,
  paymentCurrency: 'ils',
  useSystemLogo: true,
  customLogo: '',
  paletteId: 'graphite-brass',
  projectTypes: [],
  expenseCategories: [],
  exchangeUsd: '',
  exchangeSecondary: '',
  exchangeUpdatedAt: null,
  exchangeDate: '',
  taxes: {
    vat: { on: false, rate: '16' },
    income: { on: false, rate: '' },
    municipal: { on: false, rate: '' },
    other: { on: false, label: '', rate: '' },
  },
  fiscalYearStart: 1,
  invoicePrefix: 'ع.أ',
  invoiceNext: '1',
  paymentTermsDays: '14',
};

function asText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

export function mergeOfficeSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const taxes = source.taxes && typeof source.taxes === 'object' ? source.taxes : {};
  return {
    ...DEFAULT_OFFICE_SETTINGS,
    ...source,
    officeName: asText(source.officeName, DEFAULT_OFFICE_SETTINGS.officeName),
    language: source.language === 'en' ? 'en' : 'ar',
    countryCode: asText(source.countryCode, DEFAULT_OFFICE_SETTINGS.countryCode),
    paymentCurrency: ['jod', 'ils', 'usd'].includes(source.paymentCurrency)
      ? source.paymentCurrency
      : 'ils',
    useSystemLogo: source.useSystemLogo !== false,
    customLogo: asText(source.customLogo),
    paletteId: asText(source.paletteId, 'graphite-brass') === 'dark-blueprint'
      ? 'graphite-brass'
      : asText(source.paletteId, 'graphite-brass'),
    projectTypes: asList(source.projectTypes).map((row) => ({
      id: asText(row?.id, createId()),
      name: asText(row?.name),
      hours: asText(row?.hours),
      rate: asText(row?.rate),
    })),
    expenseCategories: asList(source.expenseCategories).map((row) => ({
      id: asText(row?.id, createId()),
      name: asText(row?.name),
    })),
    taxes: {
      vat: { on: Boolean(taxes.vat?.on), rate: asText(taxes.vat?.rate, '16') },
      income: { on: Boolean(taxes.income?.on), rate: asText(taxes.income?.rate) },
      municipal: { on: Boolean(taxes.municipal?.on), rate: asText(taxes.municipal?.rate) },
      other: {
        on: Boolean(taxes.other?.on),
        label: asText(taxes.other?.label),
        rate: asText(taxes.other?.rate),
      },
    },
    fiscalYearStart: Number(source.fiscalYearStart) >= 1 && Number(source.fiscalYearStart) <= 12
      ? Number(source.fiscalYearStart)
      : 1,
  };
}

export function applyOfficeAppearance(settings) {
  applyPalette(settings.paletteId);
  setAppCurrency(settings.paymentCurrency);
}

export async function loadOfficeSettings() {
  try {
    const res = await fetchOfficeSettings();
    if (res && res.settings) {
      return mergeOfficeSettings(res.settings);
    }
  } catch {
    /* keep defaults until the server is reachable */
  }
  return { ...DEFAULT_OFFICE_SETTINGS };
}

export async function saveOfficeSettings(settings) {
  await saveOfficeSettingsApi(settings);
}
