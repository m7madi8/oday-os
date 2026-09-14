import {
  ClipboardList,
  FolderKanban,
  HardHat,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { C, FONT_HEAD, MONTHS, cardShadow, count, money, pad2 } from '../theme';
import { FinanceCard, KpiMini, MonthCard, StatCard } from '../components/Cards';
import { QuickNotes } from '../components/QuickNotes';

export function Dashboard({ year, hidden }) {
  const monthsData = MONTHS.map((name) => ({ name, value: 0, hasData: false }));
  const activeMonths = monthsData.filter((m) => m.hasData);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FolderKanban} label="مشاريع نشطة" value={count(0, hidden)} delayMs={0} />
        <StatCard icon={ClipboardList} label="عقود قيد التنفيذ" value={count(0, hidden)} delayMs={60} />
        <StatCard icon={Wallet} label="دفعات مستحقة" value={money(0, hidden)} delayMs={120} />
        <StatCard icon={HardHat} label="زيارات إشراف" value={count(0, hidden)} delayMs={180} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <FinanceCard kind="income" icon={TrendingUp} label="إيرادات العقود" value={money(0, hidden)} year={year} delayMs={240} />
        <FinanceCard kind="expense" icon={TrendingDown} label="مصاريف المكتب والمواقع" value={money(0, hidden)} year={year} delayMs={300} />
        <FinanceCard kind="net" icon={Scale} label="صافي الأداء" value={money(0, hidden)} year={year} delayMs={360} />
      </div>

      <QuickNotes />

      <section
        className="rounded-2xl p-4 sm:p-6"
        style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
              التوزيع الشهري
            </h3>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: C.inkSoft }}>
              إيرادات الأتعاب والتحصيلات حسب الشهر · {year}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-5">
          <KpiMini
            label="أعلى شهر تحصيلاً"
            value="—"
            sub="يُعرض بعد تسجيل أول عقد"
          />
          <KpiMini
            label="متوسط التحصيل"
            value="—"
            sub={activeMonths.length ? `${activeMonths.length} أشهر مسجّلة` : 'لا بيانات بعد'}
          />
          <KpiMini
            label="إجمالي السنة"
            value={money(0, hidden)}
            sub="مجموع الأتعاب المحصّلة"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          {monthsData.map((m, i) => (
            <MonthCard
              key={m.name}
              index={i + 1}
              name={m.name}
              value={m.value}
              hasData={m.hasData}
              hidden={hidden}
              money={money}
              pad2={pad2}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
