import { currentPeriod } from '../labels';

const USD_PER_ILS = 3.65;

export function resolvePayrollPeriod(year, month) {
  if (month === 'all') {
    const now = new Date();
    if (String(now.getFullYear()) === String(year)) {
      return currentPeriod();
    }
    return `${year}-12`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function paymentDateParts(row) {
  const raw = row?.paid_on || row?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function filterPayrollPayments(rows = [], { year, month }) {
  return rows.filter((row) => {
    const d = paymentDateParts(row);
    if (!d) return year === 'all' && month === 'all';
    if (year !== 'all' && d.getFullYear() !== Number(year)) return false;
    if (month !== 'all' && d.getMonth() + 1 !== Number(month)) return false;
    return true;
  });
}

export function sumPayrollAmount(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
}

export function approxUsdFromIls(ils) {
  const n = Number(ils) || 0;
  return n / USD_PER_ILS;
}
