import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Package, Printer, Users } from 'lucide-react';
import { listClients } from '../lib/api/clients';
import { listExpenses } from '../lib/api/expenses';
import { listInvoices } from '../lib/api/invoices';
import { listPayments } from '../lib/api/payments';
import { listProjects } from '../lib/api/projects';
import { FONT_HEAD, MONTHS, YEARS, money } from '../theme';
import { ErrorState, GhostButton, LoadingBlock } from '../components/ui/Actions';
import { showToast } from '../lib/toast';
import { openOrSaveBlob } from '../lib/files';
import {
  buildReportCsv,
  computeReportMetrics,
  periodTitle,
} from '../lib/reports/reportMetrics';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({ label, value, sub, tone = 'default', featured = false }) {
  const className = [
    'os-reports-metric',
    featured ? 'is-featured' : '',
    tone === 'income' ? 'is-income' : '',
    tone === 'expense' ? 'is-expense' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={className}>
      <span className="os-reports-metric__label">{label}</span>
      <strong className="os-reports-metric__value os-num">{value}</strong>
      {sub ? <span className="os-reports-metric__sub">{sub}</span> : null}
    </article>
  );
}

function ReportPanel({ title, children, className = '' }) {
  return (
    <section className={`os-reports-panel ${className}`.trim()}>
      <h4 className="os-reports-panel__title" style={{ fontFamily: FONT_HEAD }}>{title}</h4>
      {children}
    </section>
  );
}

function ReportEmpty({ icon: Icon, title, body }) {
  return (
    <div className="os-reports-empty">
      <span className="os-reports-empty__icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.25} />
      </span>
      <p className="os-reports-empty__title">{title}</p>
      {body ? <p className="os-reports-empty__body">{body}</p> : null}
    </div>
  );
}

async function loadReportSource() {
  const [payments, expenses, invoices, projects, clients] = await Promise.all([
    listPayments({ per_page: 500 }),
    listExpenses({ per_page: 500 }),
    listInvoices({ per_page: 500, include: 'client' }),
    listProjects({ per_page: 500, include: 'client' }),
    listClients({ per_page: 500 }),
  ]);
  return {
    payments: payments?.data || [],
    expenses: expenses?.data || [],
    invoices: invoices?.data || [],
    projects: projects?.data || [],
    clients: clients?.data || [],
  };
}

export function Reports() {
  const printRef = useRef(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');

  const query = useQuery({
    queryKey: ['reports-dashboard', year, month],
    queryFn: loadReportSource,
  });

  const periodLabel = useMemo(() => periodTitle(year, month, MONTHS), [year, month]);

  const metrics = useMemo(() => {
    const payload = query.data || {};
    return computeReportMetrics(payload, { year, month }, MONTHS);
  }, [query.data, year, month]);

  async function exportCsv() {
    try {
      const csv = buildReportCsv(metrics, { year, month, periodLabel });
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      await openOrSaveBlob(blob, `oday-reports-${year}${month === 'all' ? '' : `-${month}`}.csv`);
      showToast('تم تصدير CSV', 'ok');
    } catch (error) {
      showToast(error.message || 'تعذر التصدير', 'error');
    }
  }

  function printPdf() {
    try {
      window.print();
      showToast('استخدم نافذة الطباعة لحفظ PDF', 'info');
    } catch (error) {
      showToast(error.message || 'تعذر الطباعة', 'error');
    }
  }

  const clientsWithActivity = metrics.clientRows.filter(
    (row) => row.income > 0 || row.projectCount > 0,
  );

  return (
    <div className="os-projects os-reports min-w-0" ref={printRef}>
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            التقارير
          </h2>
          <p className="os-projects-header__sub">الأرباح والمستحقات وربحية المشاريع</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end print-hide">
          <GhostButton type="button" onClick={printPdf}>
            <Printer size={16} strokeWidth={ICON} aria-hidden="true" />
            طباعة PDF
          </GhostButton>
          <GhostButton type="button" onClick={exportCsv}>
            <Download size={16} strokeWidth={ICON} aria-hidden="true" />
            تصدير CSV
          </GhostButton>
        </div>
      </header>

      <div className="os-projects-panel os-reports-filters print-hide">
        <div className="os-reports-filters__grid">
          <FilterField label="السنة">
            <select className="os-projects-select" value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="الشهر">
            <select className="os-projects-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="all">كل الشهور</option>
              {MONTHS.map((label, index) => (
                <option key={label} value={String(index + 1)}>{label}</option>
              ))}
            </select>
          </FilterField>
        </div>
        <p className="os-reports-filters__hint">
          اختيار شهر محدد يتطلب سنة محددة — كل المبالغ بالعملة المحفوظة مع السجلات (₪).
        </p>
      </div>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? (
        <ErrorState message={query.error?.message} onRetry={() => query.refetch()} />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <>
          <section className="os-reports-section">
            <div className="os-reports-section__head">
              <span className="os-reports-section__eyebrow">OVERVIEW</span>
              <h3 className="os-reports-section__title" style={{ fontFamily: FONT_HEAD }}>
                ملخص الفترة — {periodLabel}
              </h3>
            </div>
            <div className="os-reports-metrics">
              <MetricCard
                label="الدخل المحصل"
                value={money(metrics.income, false)}
                tone="income"
              />
              <MetricCard
                label="مصاريف"
                value={money(metrics.expenses, false)}
                tone="expense"
              />
              <MetricCard
                label="صافي الربح"
                value={money(metrics.netProfit, false)}
                tone={metrics.netProfit >= 0 ? 'income' : 'expense'}
                featured
              />
              <MetricCard
                label="كل المستحقات المفتوحة"
                value={money(metrics.openReceivables, false)}
                sub={`${metrics.openInvoiceCount} فاتورة`}
                tone="expense"
              />
            </div>
          </section>

          <section className="os-reports-section">
            <div className="os-reports-section__head os-reports-section__head--annual">
              <h3 className="os-reports-section__title" style={{ fontFamily: FONT_HEAD }}>
                ملخص السنة — {year}
              </h3>
              <span className="os-reports-annual-badge">ANNUAL</span>
            </div>
            <div className="os-reports-metrics">
              <MetricCard
                label="الأشهر الفعالة"
                value={String(metrics.activeMonths)}
                sub={year}
              />
              <MetricCard
                label="متوسط الدخل الشهري"
                value={money(metrics.avgMonthlyIncome, false)}
                sub="لكل شهر فعال"
                tone="income"
              />
              <MetricCard
                label="عدد مشاريع السنة"
                value={String(metrics.yearProjectCount)}
                sub={year}
              />
              <MetricCard
                label="عدد الفواتير"
                value={String(metrics.yearInvoiceCount)}
                sub={year}
              />
            </div>
          </section>

          <section className="os-reports-section">
            <div className="os-reports-section__head">
              <h3 className="os-reports-section__title" style={{ fontFamily: FONT_HEAD }}>
                التسلسل الشهري — {year}
              </h3>
            </div>
            <div className="os-reports-table-wrap">
              <table className="os-reports-table">
                <thead>
                  <tr>
                    <th scope="col">شهر</th>
                    <th scope="col">الدخل</th>
                    <th scope="col">مصاريف</th>
                    <th scope="col">الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.monthlySeries.map((row) => (
                    <tr key={row.month}>
                      <td>{row.label}</td>
                      <td className="os-num is-income">{money(row.income, false)}</td>
                      <td className="os-num is-expense">{money(row.expenses, false)}</td>
                      <td className={`os-num ${row.profit >= 0 ? 'is-income' : 'is-expense'}`}>
                        {money(row.profit, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="os-reports-grid">
            <ReportPanel title="قائمة الأرباح والخسائر">
              <ul className="os-reports-kv">
                <li>
                  <span>الدخل المحصل</span>
                  <strong className="os-num is-income">{money(metrics.income, false)}</strong>
                </li>
                <li>
                  <span>مصاريف</span>
                  <strong className="os-num is-expense">{money(metrics.expenses, false)}</strong>
                </li>
                <li className="is-total">
                  <span>صافي الربح</span>
                  <strong className={`os-num ${metrics.netProfit >= 0 ? 'is-income' : 'is-expense'}`}>
                    {money(metrics.netProfit, false)}
                  </strong>
                </li>
              </ul>
            </ReportPanel>

            <ReportPanel title="تقرير العملاء">
              {clientsWithActivity.length === 0 ? (
                <ReportEmpty
                  icon={Users}
                  title="ما في عملاء بعد"
                  body="أضف عملاء ومشاريع لعرض ملخص الدخل لكل عميل."
                />
              ) : (
                <ul className="os-reports-list">
                  {clientsWithActivity.slice(0, 8).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.projectCount} مشروع</span>
                      </div>
                      <strong className="os-num is-income">{money(row.income, false)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </ReportPanel>

            <ReportPanel title="المستحقات غير المحصلة">
              {metrics.openInvoices.length === 0 ? (
                <ReportEmpty
                  icon={Package}
                  title="لا مستحقات مفتوحة"
                  body="كل الفواتير محصّلة أو لا توجد فواتير بعد."
                />
              ) : (
                <ul className="os-reports-list">
                  {metrics.openInvoices.slice(0, 8).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{row.clientName}</strong>
                        <span>{row.number} · {row.dueDate}</span>
                      </div>
                      <strong className="os-num is-expense">{money(row.balance, false)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </ReportPanel>

            <ReportPanel title="ربحية المشاريع">
              {metrics.projectProfitRows.length === 0 ? (
                <ReportEmpty
                  icon={Package}
                  title="لا بيانات ربحية"
                  body="اربط مدفوعات ومصاريف بالمشاريع خلال السنة المختارة."
                />
              ) : (
                <ul className="os-reports-list">
                  {metrics.projectProfitRows.slice(0, 8).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{row.name}</strong>
                        <span>{row.type}</span>
                      </div>
                      <strong className={`os-num ${row.profit >= 0 ? 'is-income' : 'is-expense'}`}>
                        {money(row.profit, false)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </ReportPanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
