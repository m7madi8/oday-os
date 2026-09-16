import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  CircleDollarSign,
  FolderKanban,
  ScrollText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { C, FONT_HEAD, MONTHS, RADIUS, count, money, pad2 } from '../theme';
import { FinanceCard, KpiMini, MonthCard, StatCard } from '../components/Cards';
import { QuickNotes } from '../components/QuickNotes';
import { fetchOverview } from '../lib/api/office';
import { keys } from '../lib/query';
import { ErrorState, LoadingBlock } from '../components/ui/Actions';

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

export function Dashboard({ year, hidden, onNavigate }) {
  const overview = useQuery({ queryKey: keys.overview, queryFn: fetchOverview });
  const data = overview.data;
  const monthsData = useMemo(
    () => MONTHS.map((name, index) => ({
      name,
      value: 0,
      hasData: false,
      tone: monthTone(index + 1, year),
    })),
    [year],
  );

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {overview.isLoading ? <LoadingBlock /> : null}
      {overview.isError ? (
        <ErrorState error={overview.error} message={overview.error?.message} onRetry={() => overview.refetch()} />
      ) : null}

      <div className="kpi-row">
        <StatCard icon={CircleDollarSign} label="مستحقات" value={money(data?.kpis?.receivables || 0, hidden)} delayMs={0} onOpen={onNavigate ? () => onNavigate('invoices') : undefined} />
        <StatCard icon={ScrollText} label="شيكات قادمة" value={count(data?.kpis?.upcoming_cheques_count || 0, hidden)} delayMs={60} onOpen={onNavigate ? () => onNavigate('checks') : undefined} />
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={count(data?.kpis?.active_projects || 0, hidden)} delayMs={120} onOpen={onNavigate ? () => onNavigate('projects') : undefined} />
        <StatCard icon={Banknote} label="دفعات قادمة" value={count(data?.kpis?.upcoming_payments_count || 0, hidden)} delayMs={180} onOpen={onNavigate ? () => onNavigate('payments') : undefined} />
      </div>

      <div className="finance-row">
        <FinanceCard
          kind="net"
          featured
          label="صافي المستحقات"
          value={money(data?.kpis?.receivables || 0, hidden)}
          year={year}
          delayMs={240}
          months={monthsData}
        />
        <FinanceCard
          kind="expense"
          icon={TrendingDown}
          label="شيكات قادمة"
          value={money(data?.kpis?.upcoming_cheques_total || 0, hidden)}
          year={year}
          delayMs={300}
        />
        <FinanceCard
          kind="income"
          icon={TrendingUp}
          label="دفعات قادمة"
          value={money(data?.kpis?.upcoming_payments_total || 0, hidden)}
          year={year}
          delayMs={360}
        />
      </div>

      <QuickNotes />

      <section
        className="os-surface os-overview-panel p-4 sm:p-6 min-w-0"
        style={{
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.md,
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
            تنبيهات وتحصيلات
          </h3>
          <p className="text-base mt-0.5" style={{ color: C.inkSoft }}>
            من قاعدة بيانات المكتب مباشرة · {year}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <KpiMini
            label="إجمالي المستحقات"
            value={money(data?.kpis?.receivables || 0, hidden)}
            sub="من الفواتير المفتوحة"
          />
          <KpiMini
            label="نشاط أخير"
            value={data?.activity?.[0]?.label || '—'}
            sub={data?.activity?.length ? `${data.activity.length} حركة` : 'لا بيانات بعد'}
          />
          <KpiMini
            label="تنبيهات"
            value={String(data?.alerts?.length || 0)}
            sub={data?.alerts?.[0]?.title || 'لا تنبيهات معلّقة'}
          />
        </div>

        <div className="month-grid phone-hide">
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
