import {
  ArchiveX,
  Banknote,
  BarChart3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from 'lucide-react';

/** صفحات المال — للتمييز في الشريط الجانبي عند الحاجة */
export const FINANCE_PAGE_IDS = ['invoices', 'payments', 'checks', 'expenses', 'payroll', 'dead-debts'];

export const NAV_GROUPS = [
  {
    title: 'الرئيسية',
    items: [{ id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard }],
  },
  {
    title: 'المشاريع والفوترة',
    items: [
      { id: 'projects', label: 'المشاريع', icon: FolderKanban },
      { id: 'clients', label: 'العملاء', icon: Users },
      { id: 'invoices', label: 'الفواتير', icon: FileText },
    ],
  },
  {
    title: 'المصاريف',
    items: [
      { id: 'expenses', label: 'المصاريف', icon: Wallet },
      { id: 'payroll', label: 'الرواتب', icon: Banknote },
    ],
  },
  {
    title: 'التقارير',
    items: [
      { id: 'reports', label: 'التقارير', icon: BarChart3 },
      { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    ],
  },
  {
    title: 'أرشيف',
    bottom: true,
    items: [{ id: 'dead-debts', label: 'ديون ميتة قديمة', icon: ArchiveX }],
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
    byId.invoices,
    byId.clients,
  ].filter(Boolean);
  return picked.filter((item, index) => picked.findIndex((entry) => entry.id === item.id) === index);
}

export function navGroupForPage(groups, pageId) {
  return groups.find((group) => group.items.some((item) => item.id === pageId));
}
