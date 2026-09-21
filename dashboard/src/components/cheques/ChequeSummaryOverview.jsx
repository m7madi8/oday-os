import { C, FONT_SERIF, money } from '../../theme';
import { LoadingBlock } from '../ui/Actions';

function CurrencyBlock({ title, buckets, hidden }) {
  const entries = Object.entries(buckets || {});
  if (!entries.length) return null;

  return (
    <div className="space-y-3">
      {title ? <h3 className="text-sm font-semibold" style={{ color: C.inkSoft }}>{title}</h3> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map(([currency, data]) => (
          <div
            key={currency}
            className="rounded-xl p-4 min-w-0"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <div className="text-xs font-semibold mb-2" style={{ color: C.inkFaint }}>{currency}</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Metric label="إجمالي الشيكات" value={money(data.total, hidden)} />
              <Metric label="مستحقة قريبًا" value={money(data.due_soon, hidden)} />
              <Metric label="قيد التحصيل" value={money(data.processing, hidden)} />
              <Metric label="مصروف" value={money(data.cleared, hidden)} />
              <Metric label="مرتجع" value={money(data.returned, hidden)} />
              <Metric label="متأخر" value={money(data.overdue, hidden)} />
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <dt style={{ color: C.inkFaint }}>{label}</dt>
      <dd className="tabular-nums font-semibold" style={{ fontFamily: FONT_SERIF, color: C.ink }} dir="ltr">
        {value}
      </dd>
    </div>
  );
}

export function ChequeSummaryOverview({ direction, incomingSummary, outgoingSummary, allSummary, loading, error, onRetry, hidden }) {
  if (loading) return <LoadingBlock />;
  if (error) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ background: C.burgundySoft, color: C.burgundy }}>
        {error}
        {onRetry ? (
          <button type="button" className="underline ms-2 min-h-11 min-w-11" onClick={onRetry}>
            إعادة المحاولة
          </button>
        ) : null}
      </div>
    );
  }

  const showSplit = direction === 'all';

  if (showSplit) {
    return (
      <div className="space-y-6">
        <CurrencyBlock title="الشيكات الواردة" buckets={incomingSummary?.currencies} hidden={hidden} />
        <CurrencyBlock title="الشيكات الصادرة" buckets={outgoingSummary?.currencies} hidden={hidden} />
      </div>
    );
  }

  const title = direction === 'incoming' ? 'الشيكات الواردة' : direction === 'outgoing' ? 'الشيكات الصادرة' : null;
  return <CurrencyBlock title={title} buckets={allSummary?.currencies} hidden={hidden} />;
}
