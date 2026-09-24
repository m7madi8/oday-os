export const INVOICE_STATUS_OPTIONS = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'unpaid', label: 'غير مدفوعة' },
  { id: 'partial', label: 'جزئية' },
  { id: 'paid', label: 'مدفوعة' },
];

export const INVOICE_SORT_OPTIONS = [
  { id: 'newest', label: 'الأحدث أولاً' },
  { id: 'oldest', label: 'الأقدم أولاً' },
  { id: 'amount', label: 'حسب المبلغ' },
  { id: 'balance', label: 'حسب المتبقي' },
];

function parseInvoiceDate(row) {
  const raw = row?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function invoiceMillis(row) {
  const d = parseInvoiceDate(row);
  if (d) return d.getTime();
  const ts = Number(row?.created_at || 0);
  if (!ts) return 0;
  return ts > 1e12 ? ts : ts * 1000;
}

export function matchesInvoiceStatus(row, status) {
  const statusId = Number(row?.status_id);
  const balance = Number(row?.balance || 0);
  if (status === 'all') return true;
  if (status === 'paid') return statusId === 4;
  if (status === 'partial') return statusId === 3;
  if (status === 'unpaid') {
    if (statusId === 5 || statusId === 4) return false;
    return balance > 0 || statusId === 1 || statusId === 2;
  }
  return true;
}

export function collectInvoiceTags(rows = []) {
  const set = new Set();
  rows.forEach((row) => {
    const tags = Array.isArray(row?.tags) ? row.tags : [];
    tags.forEach((tag) => {
      const name = typeof tag === 'string' ? tag : tag?.name;
      if (name) set.add(String(name));
    });
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
}

export function filterAndSortInvoices(rows = [], filters) {
  const { year, month, status, tag, search, sort } = filters;
  const needle = String(search || '').trim().toLowerCase();

  const list = rows.filter((row) => {
    if (!matchesInvoiceStatus(row, status)) return false;

    if (tag !== 'all') {
      const tags = Array.isArray(row?.tags) ? row.tags : [];
      const names = tags.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
      if (!names.includes(tag)) return false;
    }

    const date = parseInvoiceDate(row);
    if (year !== 'all' && date && date.getFullYear() !== Number(year)) return false;
    if (month !== 'all' && date && date.getMonth() + 1 !== Number(month)) return false;

    if (!needle) return true;
    const hay = [
      row.number,
      row.client?.name,
      row.public_notes,
      row.private_notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return invoiceMillis(a) - invoiceMillis(b);
      case 'amount':
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      case 'balance':
        return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      default:
        return invoiceMillis(b) - invoiceMillis(a);
    }
  });

  return list;
}
