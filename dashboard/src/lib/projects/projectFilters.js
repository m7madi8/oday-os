export const PROJECT_SORT_OPTIONS = [
  { id: 'newest', label: 'الأحدث أولاً' },
  { id: 'oldest', label: 'الأقدم أولاً' },
  { id: 'name', label: 'حسب الاسم' },
  { id: 'budget', label: 'حسب القيمة' },
];

export const PROJECT_STATUS_OPTIONS = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'active', label: 'نشط' },
  { id: 'archived', label: 'مؤرشف' },
];

function projectMillis(row) {
  const ts = Number(row?.created_at || 0);
  if (!ts) return 0;
  return ts > 1e12 ? ts : ts * 1000;
}

function projectDate(row) {
  const ms = projectMillis(row);
  return ms ? new Date(ms) : null;
}

export function collectProjectTypes(rows = []) {
  const set = new Set();
  rows.forEach((row) => {
    const type = String(row?.custom_value1 || '').trim();
    if (type) set.add(type);
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
}

export function filterAndSortProjects(rows = [], filters) {
  const {
    year,
    month,
    type,
    status,
    clientId,
    search,
    sort,
  } = filters;

  const needle = String(search || '').trim().toLowerCase();

  let list = rows.filter((row) => {
    if (status === 'active' && (row.archived_at > 0 || row.is_deleted)) return false;
    if (status === 'archived' && !(row.archived_at > 0 || row.is_deleted)) return false;

    if (clientId && row.client_id !== clientId) return false;

    const rowType = String(row?.custom_value1 || '').trim();
    if (type !== 'all') {
      if (type === 'none' && rowType) return false;
      if (type !== 'none' && rowType !== type) return false;
    }

    const date = projectDate(row);
    if (year !== 'all' && date) {
      if (date.getFullYear() !== Number(year)) return false;
    }
    if (month !== 'all' && date) {
      if (date.getMonth() + 1 !== Number(month)) return false;
    }

    if (needle) {
      const hay = [
        row.name,
        row.number,
        row.client?.name,
        row.custom_value1,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }

    return true;
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return projectMillis(a) - projectMillis(b);
      case 'name':
        return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      case 'budget':
        return (b.budgeted_amount || 0) - (a.budgeted_amount || 0);
      default:
        return projectMillis(b) - projectMillis(a);
    }
  });

  return list;
}
