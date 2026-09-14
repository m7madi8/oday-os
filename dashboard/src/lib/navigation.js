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

export const FINANCE_PAGE_IDS = ['invoices', 'payments', 'checks', 'expenses', 'payroll'];

export const NAV_GROUPS = [
  {
    title: 'الرئيسية',
    items: [{ id: 'dashboard', label: 'نظرة عامة', icon: LayoutDashboard }],
  },
  {
    title: 'العمل',
    items: [
      { id: 'projects', label: 'المشاريع', icon: FolderKanban },
      { id: 'clients', label: 'العملاء', icon: Users },
      { id: 'documents', label: 'المستندات', icon: Files },
    ],
  },
  {
    title: 'المالية',
    collapsible: true,
    items: [
      { id: 'invoices', label: 'الفواتير', icon: FileText },
      { id: 'payments', label: 'الدفعات', icon: CircleDollarSign },
      { id: 'checks', label: 'الشيكات', icon: ScrollText },
      { id: 'expenses', label: 'المصاريف', icon: Wallet },
      { id: 'payroll', label: 'الرواتب', icon: Banknote },
    ],
  },
  {
    title: 'التحليلات',
    items: [{ id: 'reports', label: 'التقارير', icon: BarChart3 }],
  },
  {
    title: 'الذكاء',
    items: [{ id: 'ai-assistant', label: 'المساعد الذكي', icon: Sparkles, accent: true }],
  },
  {
    title: 'النظام',
    items: [{ id: 'settings', label: 'الإعدادات', icon: SettingsIcon }],
  },
];

export function flattenNavItems(groups = NAV_GROUPS) {
  return groups.flatMap((group) => group.items);
}
