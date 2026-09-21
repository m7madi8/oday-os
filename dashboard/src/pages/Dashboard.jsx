import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  FileText,
  FolderKanban,
  FolderPlus,
  ScrollText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { C, FONT_HEAD, MONTHS, RADIUS, count, money, pad2 } from '../theme';
import { FinanceCard, MonthCard, StatCard } from '../components/Cards';
import { QuickNotes } from '../components/QuickNotes';
import { fetchOverview } from '../lib/api/office';
import { keys } from '../lib/query';
import { timeGreeting } from '../lib/greeting';
import { displayName } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';
import { ErrorState, LoadingBlock } from '../components/ui/Actions';

const ICON = 1.6;

function monthTone(index, year) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return 'past';
  if (year > currentYear) return 'future';
  if (index < currentMonth) return 'past';
  if (index > currentMonth) return 'future';
  return 'current';
}

function alertTarget(alert) {
  if (alert?.entity_type === 'invoice') return 'invoices';
  if (alert?.entity_type === 'cheque') return 'checks';
  return 'dashboard';
}

const QUICK_ACTIONS = [
  { id: 'projects', label: 'مشروع جديد', hint: 'ابدأ عملًا جديدًا', icon: FolderPlus, primary: false },
  { id: 'invoices', label: 'فاتورة عميل', hint: 'إصدار فاتورة', icon: FileText, primary: true },
  { id: 'payments', label: 'تسجيل تحصيل', hint: 'دفعة واردة', icon: CircleDollarSign, primary: false },
  { id: 'checks', label: 'متابعة شيك', hint: 'موعد أو حالة', icon: ScrollText, primary: false },
];

function userFirstName(user) {
  const first = user?.first_name?.trim();
  if (first) return first;
  const full = displayName(user);
  return full.split(/\s+/)[0] || full;
}

export function Dashboard({ year, hidden, onNavigate }) {
  const { session } = useAuth();
  const overview = useQuery({
    queryKey: keys.overview,
    queryFn: fetchOverview,
    refetchInterval: (query) => (query.state.status === 'error' ? false : 12_000),
  });
  const data = overview.data;
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  const monthsData = useMemo(
    () => MONTHS.map((name, index) => ({
      name,
      value: 0,
      hasData: false,
      tone: monthTone(index + 1, year),
    })),
    [year],
  );

  const dateLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
    } catch {
      return String(year);
    }
  }, [year]);

  return (
    <div className="os-today space-y-6 sm:space-y-8 min-w-0">
      {overview.isLoading ? <LoadingBlock /> : null}
      {overview.isError ? (
        <ErrorState error={overview.error} message={overview.error?.message} onRetry={() => overview.refetch()} />
      ) : null}

      <header className="os-today-hero">
        <div className="os-today-hero__copy">
          <p className="os-today-hero__greet">
            {timeGreeting()}، {userFirstName(session?.user)}
          </p>
          <h2 className="os-today-hero__title" style={{ fontFamily: FONT_HEAD }}>
            لوحة المكتب
          </h2>
          <p className="os-today-hero__date">{dateLabel}</p>
        </div>
        <div className="os-today-hero__badge" aria-hidden="true">
          <span className="os-num">{year}</span>
        </div>
      </header>

      {onNavigate ? (
        <section className="os-quick-actions" aria-label="إجراءات سريعة">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                className={`os-quick-action ${action.primary ? 'is-primary' : ''}`}
                onClick={() => onNavigate(action.id)}
              >
                <span className="os-quick-action__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={ICON} />
                </span>
                <span className="os-quick-action__text">
                  <strong>{action.label}</strong>
                  <em>{action.hint}</em>
                </span>
              </button>
            );
          })}
        </section>
      ) : null}

      <section className="os-alert-feed" aria-labelledby="today-alerts-title">
        <div className="os-alert-feed__head">
          <h3 id="today-alerts-title" className="os-alert-feed__title" style={{ fontFamily: FONT_HEAD }}>
            يحتاج متابعتك
          </h3>
          <p className="os-alert-feed__sub">
            {alerts.length
              ? `${alerts.length} تنبيه — اضغط للانتقال`
              : 'لا توجد تنبيهات عاجلة — يوم هادئ للمكتب'}
          </p>
        </div>
        {alerts.length ? (
          <ul className="os-alert-feed__list">
            {alerts.slice(0, 8).map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  className="os-alert-item"
                  onClick={() => onNavigate?.(alertTarget(alert))}
                >
                  <span className="os-alert-item__dot" aria-hidden="true" />
                  <span className="os-alert-item__body">
                    <strong>{alert.title}</strong>
                    <span>{alert.body}</span>
                  </span>
                  {typeof alert.amount === 'number' ? (
                    <span className="os-alert-item__amount os-num">{money(alert.amount, hidden)}</span>
                  ) : null}
                  <ArrowLeft size={16} strokeWidth={ICON} className="os-alert-item__chev" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="os-alert-feed__empty">
            <p>كل الأمور تحت السيطرة. يمكنك إصدار فاتورة أو تسجيل تحصيل من الأزرار أعلاه.</p>
          </div>
        )}
      </section>

      <div className="kpi-row">
        <StatCard
          icon={CircleDollarSign}
          label="لم يُدفع بعد"
          value={money(data?.kpis?.receivables || 0, hidden)}
          delayMs={0}
          onOpen={onNavigate ? () => onNavigate('invoices') : undefined}
        />
        <StatCard
          icon={ScrollText}
          label="شيكات قريبة"
          value={count(data?.kpis?.upcoming_cheques_count || 0, hidden)}
          delayMs={60}
          onOpen={onNavigate ? () => onNavigate('checks') : undefined}
        />
        <StatCard
          icon={FolderKanban}
          label="مشاريع نشطة"
          value={count(data?.kpis?.active_projects || 0, hidden)}
          delayMs={120}
          onOpen={onNavigate ? () => onNavigate('projects') : undefined}
        />
        <StatCard
          icon={Banknote}
          label="تحصيل قادم"
          value={count(data?.kpis?.upcoming_payments_count || 0, hidden)}
          delayMs={180}
          onOpen={onNavigate ? () => onNavigate('payments') : undefined}
        />
      </div>

      <div className="finance-row">
        <FinanceCard
          kind="net"
          featured
          label="إجمالي المستحقات"
          value={money(data?.kpis?.receivables || 0, hidden)}
          year={year}
          delayMs={240}
          months={monthsData}
        />
        <FinanceCard
          kind="expense"
          icon={TrendingDown}
          label="قيمة الشيكات القادمة"
          value={money(data?.kpis?.upcoming_cheques_total || 0, hidden)}
          year={year}
          delayMs={300}
        />
        <FinanceCard
          kind="income"
          icon={TrendingUp}
          label="تحصيلات متوقعة"
          value={money(data?.kpis?.upcoming_payments_total || 0, hidden)}
          year={year}
          delayMs={360}
        />
      </div>

      <QuickNotes />

      <section
        className="os-surface os-overview-panel p-4 sm:p-6 min-w-0 phone-hide"
        style={{
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.md,
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
            نظرة على السنة
          </h3>
          <p className="text-base mt-0.5" style={{ color: C.inkSoft }}>
            تتبع شهري · {year}
          </p>
        </div>
        <div className="month-grid">
          {monthsData.map((month, index) => (
            <MonthCard
              key={month.name}
              index={index + 1}
              name={month.name}
              value={month.value}
              hasData={month.hasData}
              hidden={hidden}
              money={money}
              pad2={pad2}
              tone={month.tone}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
