export const DEAD_DEBT_SORT_OPTIONS = [
  { id: 'newest', label: 'الأحدث تسجيلاً' },
  { id: 'oldest', label: 'الأقدم تسجيلاً' },
  { id: 'amount', label: 'حسب المبلغ' },
  { id: 'year', label: 'حسب سنة الدين' },
];

export function sumDeadDebtAmounts(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function filterAndSortDeadDebts(rows = [], filters) {
  const { year, search, sort } = filters;
  const needle = String(search || '').trim().toLowerCase();

  const list = rows.filter((row) => {
    if (year !== 'all' && String(row.debt_year || '') !== String(year)) return false;
    if (!needle) return true;
    const hay = [row.client_name, row.notes, row.debt_year]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return (Number(a.created_at) || 0) - (Number(b.created_at) || 0);
      case 'amount':
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      case 'year':
        return (Number(b.debt_year) || 0) - (Number(a.debt_year) || 0);
      default:
        return (Number(b.created_at) || 0) - (Number(a.created_at) || 0);
    }
  });

  return list;
}
