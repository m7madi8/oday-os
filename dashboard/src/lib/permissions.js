export function can(permissions, isAdmin, isOwner, action) {
  if (isAdmin || isOwner) return true;
  const list = String(permissions || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (list.includes(action) || list.includes('create_all') || list.includes('edit_all') || list.includes('view_all')) {
    return true;
  }
  if (action.startsWith('view_') && list.includes(action.replace('view_', 'edit_'))) {
    return true;
  }
  return false;
}

export function canUser(user, action) {
  if (!user) return false;
  return can(user.permissions, user.is_admin, user.is_owner, action);
}

export function displayName(user) {
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  return name || user?.email || 'عدي أبو ضحى';
}

export const PAGE_PERMISSIONS = {
  dashboard: null,
  projects: 'view_project',
  clients: 'view_client',
  documents: 'view_client',
  invoices: 'view_invoice',
  'dead-debts': 'view_invoice',
  payments: 'view_payment',
  checks: 'view_payment',
  expenses: 'view_expense',
  payroll: 'view_expense',
  reports: 'view_reports',
  'ai-assistant': null,
  settings: null,
};

export function canOpenPage(user, pageId) {
  if (!user) return false;
  if (user.is_admin || user.is_owner) return true;
  const permission = PAGE_PERMISSIONS[pageId];
  if (!permission) return true;
  if (pageId === 'reports') {
    return canUser(user, 'view_reports') || canUser(user, 'view_invoice');
  }
  return canUser(user, permission);
}

export function filterNavGroups(groups, user) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canOpenPage(user, item.id)),
    }))
    .filter((group) => group.items.length > 0);
}
