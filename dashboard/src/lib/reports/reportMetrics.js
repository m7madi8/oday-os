function parseRowDate(raw) {
  if (!raw) return null;
  if (typeof raw === 'number' || /^\d+$/.test(String(raw))) {
    const n = Number(raw);
    const d = new Date(n > 1e12 ? n : n * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inCalendarFilter(date, year, month) {
  if (!date) return false;
  if (date.getFullYear() !== Number(year)) return false;
  if (month !== 'all' && date.getMonth() + 1 !== Number(month)) return false;
  return true;
}

function inYear(date, year) {
  return date && date.getFullYear() === Number(year);
}

export function computeReportMetrics({
  payments = [],
  expenses = [],
  invoices = [],
  projects = [],
}, { year, month }) {
  let income = 0;
  let expenseTotal = 0;
  const activeMonths = new Set();

  payments.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inCalendarFilter(d, year, month)) return;
    income += Number(row.amount) || 0;
    if (d) activeMonths.add(d.getMonth() + 1);
  });

  expenses.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inCalendarFilter(d, year, month)) return;
    expenseTotal += Number(row.amount) || 0;
    if (d) activeMonths.add(d.getMonth() + 1);
  });

  let openReceivables = 0;
  let openInvoiceCount = 0;
  invoices.forEach((row) => {
    const statusId = Number(row.status_id);
    const balance = Number(row.balance) || 0;
    if (statusId === 5 || balance <= 0) return;
    openReceivables += balance;
    openInvoiceCount += 1;
  });

  let yearIncome = 0;
  const yearActiveMonths = new Set();
  payments.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inYear(d, year)) return;
    yearIncome += Number(row.amount) || 0;
    if (d) yearActiveMonths.add(d.getMonth() + 1);
  });
  expenses.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inYear(d, year)) return;
    if (d) yearActiveMonths.add(d.getMonth() + 1);
  });

  let projectCount = 0;
  projects.forEach((row) => {
    const d = parseRowDate(row.created_at);
    if (inYear(d, year)) projectCount += 1;
  });

  let invoiceCount = 0;
  invoices.forEach((row) => {
    const d = parseRowDate(row.date);
    if (inYear(d, year)) invoiceCount += 1;
  });

  const activeMonthCount = yearActiveMonths.size;
  const avgMonthlyIncome = activeMonthCount ? yearIncome / activeMonthCount : 0;

  return {
    income,
    expenses: expenseTotal,
    netProfit: income - expenseTotal,
    openReceivables,
    openInvoiceCount,
    activeMonths: activeMonthCount,
    avgMonthlyIncome,
    yearProjectCount: projectCount,
    yearInvoiceCount: invoiceCount,
  };
}

export function periodTitle(year, month, months) {
  if (month === 'all') return String(year);
  const label = months[Number(month) - 1] || month;
  return `${label} ${year}`;
}

export function buildReportCsv(metrics, { year, month, periodLabel }) {
  const lines = [
    ['التقارير', 'ODAY OS'],
    ['الفترة', periodLabel],
    [],
    ['ملخص الفترة', ''],
    ['الدخل المحصل', metrics.income],
    ['مصاريف', metrics.expenses],
    ['صافي الربح', metrics.netProfit],
    ['كل المستحقات المفتوحة', metrics.openReceivables],
    ['عدد الفواتير المفتوحة', metrics.openInvoiceCount],
    [],
    ['ملخص السنة', year],
    ['الأشهر الفعالة', metrics.activeMonths],
    ['متوسط الدخل الشهري', metrics.avgMonthlyIncome],
    ['عدد مشاريع السنة', metrics.yearProjectCount],
    ['عدد الفواتير', metrics.yearInvoiceCount],
  ];
  return lines.map((row) => row.join(',')).join('\n');
}
