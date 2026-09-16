import { ODAY_COLORS, ODAY_LOGIN, ODAY_PRIMITIVES } from '../oday-theme/tokens.js';

export const C = ODAY_COLORS;

export const OE = ODAY_LOGIN;
export const P = ODAY_PRIMITIVES;

export const FONT_HEAD = 'NotoKufiArabic_600SemiBold';
export const FONT_HEAD_BOLD = 'NotoKufiArabic_700Bold';
export const FONT_BODY = 'IBMPlexSansArabic_400Regular';
export const FONT_BODY_MED = 'IBMPlexSansArabic_500Medium';
export const FONT_BODY_SEMI = 'IBMPlexSansArabic_600SemiBold';
export const FONT_SERIF = 'Fraunces_600SemiBold';

/** Match dashboard/src/theme.js + index.css mobile tokens */
export const RADIUS = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const TAP = 44;

export const LAYOUT = {
  contentPadX: 18,
  contentPadBottom: 120,
  sectionGap: 12,
  cardGap: 10,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: P.black950,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBar: {
    shadowColor: P.black950,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

export const PAGE_META: Record<string, { title: string }> = {
  index: { title: 'نظرة عامة' },
  projects: { title: 'المشاريع' },
  clients: { title: 'العملاء' },
  finance: { title: 'المالية' },
  more: { title: 'المزيد' },
  invoices: { title: 'الفواتير' },
  payments: { title: 'الدفعات' },
  expenses: { title: 'المصاريف' },
  cheques: { title: 'الشيكات' },
  documents: { title: 'المستندات' },
  ai: { title: 'المساعد الذكي' },
};

export const CURRENCIES: Record<string, { id: string; label: string; symbol: string }> = {
  ils: { id: 'ils', label: 'شيكل', symbol: '₪' },
  jod: { id: 'jod', label: 'دينار', symbol: 'د.أ' },
  usd: { id: 'usd', label: 'دولار', symbol: '$' },
};

const IN_CURRENCY: Record<string, string> = {
  '1': 'usd',
  '2': 'gbp',
  '3': 'eur',
};

export function currencyFromId(id?: string, officeCurrency?: string) {
  if (officeCurrency && CURRENCIES[officeCurrency]) {
    return CURRENCIES[officeCurrency];
  }
  if (id && IN_CURRENCY[id] && CURRENCIES[IN_CURRENCY[id]]) {
    return CURRENCIES[IN_CURRENCY[id]];
  }
  return CURRENCIES.ils;
}

export function money(value: number | string | null | undefined, symbol = '₪') {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function count(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-US');
}
