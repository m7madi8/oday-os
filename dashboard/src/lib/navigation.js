import {
  Banknote,
  BarChart3,
  CircleDollarSign,
  FileText,
  Files,
  FolderKanban,
  LayoutDashboard,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';

/** صفحات المال — للتمييز في الشريط الجانبي عند الحاجة */
export const FINANCE_PAGE_IDS = ['invoices', 'payments', 'checks', 'expenses', 'payroll'];

export const NAV_GROUPS = [
  {
    title: 'البداية',
    items: [{ id: 'dashboard', label: 'اليوم', icon: LayoutDashboard }],
  },
  {
    title: 'العمل',
    items: [
      { id: 'projects', label: 'المشاريع', icon: FolderKanban },
      { id: 'clients', label: 'العملاء', icon: Users },
      { id: 'documents', label: 'ملفات المشاريع', icon: Files },
    ],
  },
  {
    title: 'المال',
    items: [
      { id: 'invoices', label: 'فواتير العملاء', icon: FileText },
      { id: 'payments', label: 'تحصيل من العملاء', icon: CircleDollarSign },
      { id: 'checks', label: 'الشيكات', icon: ScrollText },
      { id: 'expenses', label: 'مصروف المكتب', icon: Wallet },
      { id: 'payroll', label: 'رواتب الفريق', icon: Banknote },
    ],
  },
  {
    title: 'الذكاء الاصطناعي',
    items: [{ id: 'ai-assistant', label: 'مساعد AI', icon: Sparkles }],
  },
  {
    title: 'النظام',
    items: [
      { id: 'reports', label: 'التقارير', icon: BarChart3 },
      { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    ],
  },
];

export function flattenNavItems(groups = NAV_GROUPS) {
  return groups.flatMap((group) => group.items);
}

export function mobileTabItems(groups = NAV_GROUPS) {
  const items = flattenNavItems(groups);
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  const picked = [
    byId.dashboard,
    byId.projects,
    byId.checks,
    byId.clients,
  ].filter(Boolean);
  return picked.filter((item, index) => picked.findIndex((entry) => entry.id === item.id) === index);
}
