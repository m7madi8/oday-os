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

function isOpenInvoice(row) {
  const statusId = Number(row.status_id);
  const balance = Number(row.balance) || 0;
  return statusId !== 5 && balance > 0;
}

export function computeReportMetrics({
  payments = [],
  expenses = [],
  invoices = [],
  projects = [],
  clients = [],
}, { year, month }, monthLabels = []) {
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
    if (!isOpenInvoice(row)) return;
    openReceivables += Number(row.balance) || 0;
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

  const monthlySeries = (monthLabels.length ? monthLabels : []).map((label, index) => {
    const monthNum = index + 1;
    let monthIncome = 0;
    let monthExpenses = 0;
    payments.forEach((row) => {
      const d = parseRowDate(row.date || row.payment_date);
      if (!d || d.getFullYear() !== Number(year) || d.getMonth() + 1 !== monthNum) return;
      monthIncome += Number(row.amount) || 0;
    });
    expenses.forEach((row) => {
      const d = parseRowDate(row.date || row.payment_date);
      if (!d || d.getFullYear() !== Number(year) || d.getMonth() + 1 !== monthNum) return;
      monthExpenses += Number(row.amount) || 0;
    });
    return {
      month: monthNum,
      label,
      income: monthIncome,
      expenses: monthExpenses,
      profit: monthIncome - monthExpenses,
    };
  });

  const clientProjectCounts = new Map();
  projects.forEach((row) => {
    const d = parseRowDate(row.created_at);
    if (!inYear(d, year)) return;
    const id = row.client_id;
    if (!id) return;
    clientProjectCounts.set(id, (clientProjectCounts.get(id) || 0) + 1);
  });

  const clientIncome = new Map();
  payments.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inYear(d, year)) return;
    const id = row.client_id;
    if (!id) return;
    clientIncome.set(id, (clientIncome.get(id) || 0) + (Number(row.amount) || 0));
  });

  const clientRows = (clients || []).map((client) => ({
    id: client.id,
    name: client.name || '—',
    projectCount: clientProjectCounts.get(client.id) || 0,
    income: clientIncome.get(client.id) || 0,
  })).sort((a, b) => b.income - a.income || b.projectCount - a.projectCount);

  const openInvoices = invoices
    .filter(isOpenInvoice)
    .map((row) => ({
      id: row.id,
      number: row.number || row.invoice_number || '—',
      clientName: row.client?.name || '—',
      balance: Number(row.balance) || 0,
      dueDate: row.due_date || row.date || '—',
    }))
    .sort((a, b) => b.balance - a.balance);

  const projectIncome = new Map();
  const projectExpense = new Map();
  payments.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inYear(d, year) || !row.project_id) return;
    projectIncome.set(
      row.project_id,
      (projectIncome.get(row.project_id) || 0) + (Number(row.amount) || 0),
    );
  });
  expenses.forEach((row) => {
    const d = parseRowDate(row.date || row.payment_date);
    if (!inYear(d, year) || !row.project_id) return;
    projectExpense.set(
      row.project_id,
      (projectExpense.get(row.project_id) || 0) + (Number(row.amount) || 0),
    );
  });

  const projectIds = new Set([...projectIncome.keys(), ...projectExpense.keys()]);
  const projectProfitRows = [...projectIds].map((id) => {
    const meta = projects.find((p) => p.id === id);
    const inc = projectIncome.get(id) || 0;
    const exp = projectExpense.get(id) || 0;
    return {
      id,
      name: meta?.name || '—',
      type: meta?.custom_value1 || '—',
      income: inc,
      expenses: exp,
      profit: inc - exp,
    };
  }).sort((a, b) => b.profit - a.profit);

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
    monthlySeries,
    clientRows,
    openInvoices,
    projectProfitRows,
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
    [],
    ['التسلسل الشهري', year],
    ['الشهر', 'الدخل', 'مصاريف', 'الربح'],
    ...(metrics.monthlySeries || []).map((row) => [row.label, row.income, row.expenses, row.profit]),
  ];
  return lines.map((row) => row.join(',')).join('\n');
}
