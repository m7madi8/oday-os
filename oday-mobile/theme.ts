export const C = {
  paper: '#F4F6F8',
  dot: '#D2D7DE',
  ink: '#12141A',
  inkSoft: '#5A616C',
  inkFaint: '#8A919C',
  tint: '#E8ECF1',
  sidebar: '#111214',
  bronze1: '#8B93A0',
  bronze2: '#4E5664',
  burgundy: '#B45454',
  burgundySoft: '#F6EAEA',
  emerald: '#2F6B5A',
  emeraldSoft: '#E6F1ED',
  border: '#DCE1E8',
  card: '#FFFFFF',
  focus: '#4E5664',
  white: '#FFFFFF',
} as const;

export const FONT_HEAD = 'NotoKufiArabic_600SemiBold';
export const FONT_HEAD_BOLD = 'NotoKufiArabic_700Bold';
export const FONT_BODY = 'IBMPlexSansArabic_400Regular';
export const FONT_BODY_MED = 'IBMPlexSansArabic_500Medium';
export const FONT_BODY_SEMI = 'IBMPlexSansArabic_600SemiBold';

export const RADIUS = 18;
export const TAP = 44;

export const shadow = {
  shadowColor: '#0F1218',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
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
