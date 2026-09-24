export const CLIENT_SORT_OPTIONS = [
  { id: 'projects', label: 'الأكثر مشاريع' },
  { id: 'newest', label: 'الأحدث أولاً' },
  { id: 'oldest', label: 'الأقدم أولاً' },
  { id: 'name', label: 'حسب الاسم' },
  { id: 'balance', label: 'حسب الرصيد' },
];

function clientMillis(row) {
  const ts = Number(row?.created_at || 0);
  if (!ts) return 0;
  return ts > 1e12 ? ts : ts * 1000;
}

function clientDate(row) {
  const ms = clientMillis(row);
  return ms ? new Date(ms) : null;
}

export function buildProjectCountByClient(projects = []) {
  const map = new Map();
  projects.forEach((project) => {
    const id = project?.client_id;
    if (!id) return;
    map.set(id, (map.get(id) || 0) + 1);
  });
  return map;
}

export function enrichClientsWithProjects(clients = [], projectCountMap) {
  return clients.map((client) => ({
    ...client,
    project_count: projectCountMap.get(client.id) || 0,
  }));
}

export function filterAndSortClients(rows = [], filters) {
  const { year, month, search, sort } = filters;
  const needle = String(search || '').trim().toLowerCase();

  let list = rows.filter((row) => {
    const date = clientDate(row);
    if (year !== 'all' && date && date.getFullYear() !== Number(year)) return false;
    if (month !== 'all' && date && date.getMonth() + 1 !== Number(month)) return false;

    if (!needle) return true;

    const contactPhone = row.contacts?.[0]?.phone || row.phone || '';
    const contactEmail = row.contacts?.[0]?.email || row.email || '';
    const hay = [row.name, row.display_name, row.number, contactPhone, contactEmail]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'projects':
        return (b.project_count || 0) - (a.project_count || 0)
          || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      case 'oldest':
        return clientMillis(a) - clientMillis(b);
      case 'name':
        return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
      case 'balance':
        return (b.balance || 0) - (a.balance || 0);
      default:
        return clientMillis(b) - clientMillis(a);
    }
  });

  return list;
}
