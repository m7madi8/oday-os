export const EXPENSE_TYPE_OPTIONS = [
  { id: 'all', label: 'كل المصاريف' },
  { id: 'office', label: 'مصاريف مكتب' },
  { id: 'project', label: 'مصاريف مشاريع' },
];

function parseExpenseDate(row) {
  const raw = row?.date || row?.payment_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function expenseKind(row) {
  const projectId = row?.project_id;
  if (projectId && projectId !== '0' && projectId !== '') return 'project';
  return 'office';
}

export function filterExpenses(rows = [], filters) {
  const { year, month, type, search } = filters;
  const needle = String(search || '').trim().toLowerCase();

  const list = rows.filter((row) => {
    const kind = expenseKind(row);
    if (type === 'office' && kind !== 'office') return false;
    if (type === 'project' && kind !== 'project') return false;

    const date = parseExpenseDate(row);
    if (year !== 'all' && date && date.getFullYear() !== Number(year)) return false;
    if (month !== 'all' && date && date.getMonth() + 1 !== Number(month)) return false;

    if (!needle) return true;
    const hay = [
      row.public_notes,
      row.private_notes,
      row.number,
      row.project?.name,
      row.category?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });

  return list.sort((a, b) => {
    const da = parseExpenseDate(a)?.getTime() || 0;
    const db = parseExpenseDate(b)?.getTime() || 0;
    return db - da;
  });
}

export function sumExpenseAmounts(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}
