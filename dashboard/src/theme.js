const v = (name) => `var(--c-${name})`;

export const C = {
  paper: v('paper'),
  dot: v('dot'),
  ink: v('ink'),
  inkSoft: v('inkSoft'),
  inkFaint: v('inkFaint'),
  tint: v('tint'),

  sidebar: v('sidebar'),
  sidebarSoft: v('sidebarSoft'),
  sidebarLine: v('sidebarLine'),
  sidebarText: v('sidebarText'),
  sidebarTextFaint: v('sidebarTextFaint'),
  sidebarTitle: v('sidebarTitle'),

  bronze1: v('bronze1'),
  bronze2: v('bronze2'),
  bronzeLine: v('bronzeLine'),

  burgundy: v('burgundy'),
  burgundySoft: v('burgundySoft'),
  burgundyLine: v('burgundyLine'),

  emerald: v('emerald'),
  emeraldSoft: v('emeraldSoft'),
  emeraldLine: v('emeraldLine'),

  border: v('border'),
  card: v('card'),
  focus: v('focus'),
};

export const FONT_HEAD = "'Noto Kufi Arabic', sans-serif";
export const FONT_BODY = "'IBM Plex Sans Arabic', sans-serif";

export const cardShadow = '0 1px 2px rgba(15,18,24,0.05), 0 16px 34px -22px rgba(15,18,24,0.38)';

export const YEARS = [2027, 2026, 2025, 2024];

export const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const PAGE_META = {
  dashboard: { title: 'نظرة عامة' },
  projects: { title: 'المشاريع', subtitle: 'تصميم، مخططات، إشراف، وتنسيق مواقع' },
  clients: { title: 'العملاء', subtitle: 'الملاك، المطوّرون، والجهات المتعاقدة' },
  documents: { title: 'المستندات', subtitle: 'عقود، مخططات، ومرفقات المشاريع' },
  invoices: { title: 'الفواتير', subtitle: 'أتعاب المراحل والدفعات المستحقة' },
  payments: { title: 'الدفعات', subtitle: 'تحصيل الأتعاب والدفعات من العملاء' },
  checks: { title: 'الشيكات', subtitle: 'شيكات واردة وصادرة ومتابعة الصرف' },
  expenses: { title: 'المصاريف', subtitle: 'مصاريف المكتب، المواقع، والبرامج الهندسية' },
  payroll: { title: 'الرواتب', subtitle: 'كادر المكتب — مهندسون، رسامون، وإداريون' },
  reports: { title: 'التقارير', subtitle: 'أداء المشاريع والتحصيلات حسب الفترة' },
  'ai-assistant': { title: 'المساعد الذكي' },
  settings: { title: 'الإعدادات', subtitle: 'هوية المكتب الهندسي، الأتعاب، والضرائب المحلية' },
};

export const CURRENCIES = {
  ils: { id: 'ils', label: 'شيكل (₪)', symbol: '₪' },
  jod: { id: 'jod', label: 'دينار (د.أ)', symbol: 'د.أ' },
  usd: { id: 'usd', label: 'دولار ($)', symbol: '$' },
};

const COLOR_KEYS = [
  'paper', 'dot', 'ink', 'inkSoft', 'inkFaint', 'tint',
  'sidebar', 'sidebarSoft', 'sidebarLine', 'sidebarText', 'sidebarTextFaint', 'sidebarTitle',
  'bronze1', 'bronze2', 'bronzeLine',
  'burgundy', 'burgundySoft', 'burgundyLine',
  'emerald', 'emeraldSoft', 'emeraldLine',
  'border', 'card', 'focus',
];

export const PALETTES = [
  {
    id: 'graphite-brass',
    name: 'Graphite & Steel',
    swatches: ['#111214', '#8B93A0', '#4E5664', '#F4F6F8'],
    sidebarDark: true,
    colors: {
      paper: '#F4F6F8',
      dot: '#D2D7DE',
      ink: '#12141A',
      inkSoft: '#5A616C',
      inkFaint: '#8A919C',
      tint: '#E8ECF1',
      sidebar: '#111214',
      sidebarSoft: '#1C1E24',
      sidebarLine: 'rgba(255,255,255,0.08)',
      sidebarText: '#E6E8ED',
      sidebarTextFaint: '#848B96',
      sidebarTitle: '#F3F5F8',
      bronze1: '#8B93A0',
      bronze2: '#4E5664',
      bronzeLine: 'rgba(139,147,160,0.35)',
      burgundy: '#B45454',
      burgundySoft: '#F6EAEA',
      burgundyLine: '#E4C8C8',
      emerald: '#2F6B5A',
      emeraldSoft: '#E6F1ED',
      emeraldLine: '#C5D9D1',
      border: '#DCE1E8',
      card: '#FFFFFF',
      focus: '#4E5664',
    },
  },
  {
    id: 'navy-blueprint',
    name: 'Navy Blueprint',
    swatches: ['#0B1F3A', '#3D6FA8', '#6FA0D6', '#F3F6FA'],
    sidebarDark: true,
    colors: {
      paper: '#F3F6FA',
      dot: '#D4DDE8',
      ink: '#0F1C2E',
      inkSoft: '#5A6A7D',
      inkFaint: '#8A97A6',
      tint: '#E6EEF6',
      sidebar: '#0B1F3A',
      sidebarSoft: '#163154',
      sidebarLine: 'rgba(255,255,255,0.08)',
      sidebarText: '#D7E4F2',
      sidebarTextFaint: '#7E93AB',
      sidebarTitle: '#F4F8FC',
      bronze1: '#6FA0D6',
      bronze2: '#3D6FA8',
      bronzeLine: 'rgba(61,111,168,0.35)',
      burgundy: '#C45C6A',
      burgundySoft: '#F6E8EC',
      burgundyLine: '#E4C8D0',
      emerald: '#2F6B62',
      emeraldSoft: '#E3F0ED',
      emeraldLine: '#C5DDD8',
      border: '#D5DFEA',
      card: '#FFFFFF',
      focus: '#3D6FA8',
    },
  },
  {
    id: 'olive-studio',
    name: 'Forest Studio',
    swatches: ['#1B211C', '#6E8B73', '#3F5A45', '#F3F5F4'],
    sidebarDark: true,
    colors: {
      paper: '#F3F5F4',
      dot: '#D3DAD5',
      ink: '#161A17',
      inkSoft: '#5A635C',
      inkFaint: '#8A938C',
      tint: '#E7EEE9',
      sidebar: '#1B211C',
      sidebarSoft: '#2A322C',
      sidebarLine: 'rgba(255,255,255,0.08)',
      sidebarText: '#E4EAE6',
      sidebarTextFaint: '#849088',
      sidebarTitle: '#F3F6F4',
      bronze1: '#6E8B73',
      bronze2: '#3F5A45',
      bronzeLine: 'rgba(110,139,115,0.4)',
      burgundy: '#B45454',
      burgundySoft: '#F6EAEA',
      burgundyLine: '#E4C8C8',
      emerald: '#3F5A45',
      emeraldSoft: '#E4EFE7',
      emeraldLine: '#C5D8CA',
      border: '#D5DDD8',
      card: '#FFFFFF',
      focus: '#3F5A45',
    },
  },
  {
    id: 'sand-ink',
    name: 'Slate Ink',
    swatches: ['#16181C', '#A8B0BA', '#5C6570', '#F4F5F7'],
    sidebarDark: true,
    colors: {
      paper: '#F4F5F7',
      dot: '#D3D7DE',
      ink: '#14161A',
      inkSoft: '#5C636C',
      inkFaint: '#8A919A',
      tint: '#E8EBF0',
      sidebar: '#16181C',
      sidebarSoft: '#24282E',
      sidebarLine: 'rgba(255,255,255,0.08)',
      sidebarText: '#E6E9ED',
      sidebarTextFaint: '#848B94',
      sidebarTitle: '#F3F5F8',
      bronze1: '#A8B0BA',
      bronze2: '#5C6570',
      bronzeLine: 'rgba(168,176,186,0.4)',
      burgundy: '#C45C6A',
      burgundySoft: '#F6E8EC',
      burgundyLine: '#E4C8D0',
      emerald: '#2F6B5A',
      emeraldSoft: '#E6F1ED',
      emeraldLine: '#C5D9D1',
      border: '#D8DCE3',
      card: '#FFFFFF',
      focus: '#5C6570',
    },
  },
  {
    id: 'light-linen',
    name: 'Light Marble',
    swatches: ['#ECEEF2', '#6B7380', '#A8B0BA', '#F7F8FA'],
    sidebarDark: false,
    colors: {
      paper: '#F7F8FA',
      dot: '#D5D9E0',
      ink: '#1A1E24',
      inkSoft: '#5C636C',
      inkFaint: '#8A919A',
      tint: '#ECEEF2',
      sidebar: '#ECEEF2',
      sidebarSoft: '#E1E4EA',
      sidebarLine: 'rgba(26,30,36,0.08)',
      sidebarText: '#3A404A',
      sidebarTextFaint: '#7A828C',
      sidebarTitle: '#1A1E24',
      bronze1: '#6B7380',
      bronze2: '#4A5160',
      bronzeLine: 'rgba(107,115,128,0.35)',
      burgundy: '#B45454',
      burgundySoft: '#F6EAEA',
      burgundyLine: '#E4C8C8',
      emerald: '#2F6B5A',
      emeraldSoft: '#E6F1ED',
      emeraldLine: '#C5D9D1',
      border: '#D5D9E0',
      card: '#FFFFFF',
      focus: '#4A5160',
    },
  },
];

export function getPalette(id) {
  return PALETTES.find((palette) => palette.id === id) || PALETTES[0];
}

export function applyPalette(id) {
  if (typeof document === 'undefined') return;
  const palette = getPalette(id);
  const root = document.documentElement;
  COLOR_KEYS.forEach((key) => {
    if (palette.colors[key]) root.style.setProperty(`--c-${key}`, palette.colors[key]);
  });
  root.dataset.sidebar = palette.sidebarDark ? 'dark' : 'light';
  document.body.style.background = palette.colors.paper;
}

let activeCurrency = 'ils';

export function setAppCurrency(id) {
  activeCurrency = CURRENCIES[id] ? id : 'ils';
}

export function getAppCurrency() {
  return CURRENCIES[activeCurrency] || CURRENCIES.ils;
}

export function money(value, hidden) {
  const { symbol } = getAppCurrency();
  if (hidden) return `${symbol} ••••`;
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}${symbol}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function count(value, hidden) {
  if (hidden) return '••';
  return Number(value).toLocaleString('en-US');
}

export function pad2(n) {
  return String(n).toLocaleString('en-US', { minimumIntegerDigits: 2 });
}
