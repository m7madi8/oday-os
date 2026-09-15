export function can(permissions: string, isAdmin: boolean, isOwner: boolean, action: string) {
  if (isAdmin || isOwner) return true;
  const list = permissions.split(',').map((item) => item.trim()).filter(Boolean);
  if (list.includes(action) || list.includes('create_all') || list.includes('edit_all') || list.includes('view_all')) {
    return true;
  }
  if (action.startsWith('view_') && list.includes(action.replace('view_', 'edit_'))) {
    return true;
  }
  return false;
}

export function displayName(user?: { first_name?: string; last_name?: string; email?: string } | null) {
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();
  return name || user?.email || 'عدي أبو ضحى';
}
