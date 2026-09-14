import { C, FONT_HEAD, FONT_BODY, cardShadow } from '../theme';
import { BrandLogo } from './BrandLogo';

export function StatCard({ icon: Icon, label, value, delayMs }) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 fade-up"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow, animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="flex items-center justify-center rounded-xl"
          style={{ width: 34, height: 34, background: C.tint, color: C.ink }}
        >
          <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
        </span>
      </div>
      <div className="text-xl sm:text-2xl font-semibold tabular-nums whitespace-nowrap overflow-hidden" style={{ color: C.ink }}>
        {value}
      </div>
      <div className="text-xs sm:text-sm mt-1" style={{ color: C.inkSoft }}>
        {label}
      </div>
    </div>
  );
}

export function FinanceCard({ kind, icon: Icon, label, value, year, delayMs }) {
  let bg, text, sub, border, iconBg;
  if (kind === 'net') {
    bg = `linear-gradient(150deg, ${C.bronze1} 0%, ${C.bronze2} 100%)`;
    text = '#211803';
    sub = 'rgba(33,24,3,0.62)';
    border = 'transparent';
    iconBg = 'rgba(255,255,255,0.3)';
  } else if (kind === 'expense') {
    bg = C.burgundySoft;
    text = C.burgundy;
    sub = '#8C625C';
    border = C.burgundyLine;
    iconBg = 'rgba(124,59,52,0.12)';
  } else {
    bg = C.emeraldSoft;
    text = C.emerald;
    sub = '#5C7A6B';
    border = C.emeraldLine;
    iconBg = 'rgba(60,94,76,0.12)';
  }

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 fade-up min-w-0 overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}`, boxShadow: cardShadow, animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: iconBg, color: text }}>
          <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
        </span>
        {kind === 'net' && (
          <span
            className="text-[11px] px-2 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.32)', color: text, fontFamily: FONT_BODY }}
          >
            الصافي
          </span>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold tabular-nums whitespace-nowrap overflow-hidden" style={{ color: text }}>
        {value}
      </div>
      <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
        <span className="text-xs sm:text-sm truncate min-w-0" style={{ color: sub }}>{label}</span>
        <span className="text-xs sm:text-sm tabular-nums shrink-0" style={{ color: sub }}>{year}</span>
      </div>
    </div>
  );
}

export function MonthCard({ index, name, value, hasData, hidden, money, pad2 }) {
  return (
    <div
      className="rounded-xl p-3 sm:p-4 flex flex-col justify-between min-w-0"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: cardShadow, minHeight: 108 }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium min-w-0 truncate" style={{ color: C.ink }}>{name}</span>
        <span
          className="text-xs tabular-nums leading-none px-1 py-1 rounded-md shrink-0"
          style={{ color: C.inkFaint, background: C.tint }}
        >
          {pad2(index)}/12
        </span>
      </div>

      <div className="min-w-0">
        <div
          className="text-sm sm:text-base font-semibold tabular-nums mb-2 whitespace-nowrap overflow-hidden"
          style={{ color: hasData ? C.ink : C.inkFaint }}
        >
          {hasData ? money(value, hidden) : '—'}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.tint }}>
          <div
            className="h-full rounded-full"
            style={{
              width: hasData ? '55%' : '0%',
              background: hasData ? (value >= 0 ? C.emerald : C.burgundy) : 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function KpiMini({ label, value, sub }) {
  return (
    <div className="w-full sm:flex-1 min-w-0 px-4 py-3 rounded-xl" style={{ background: C.tint }}>
      <div className="text-xs mb-1" style={{ color: C.inkSoft }}>{label}</div>
      <div className="text-lg font-semibold tabular-nums" style={{ color: C.ink }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: C.inkFaint }}>{sub}</div>}
    </div>
  );
}

export function PlaceholderPage({ id, pageMeta, navGroups, FileText }) {
  const meta = pageMeta[id];
  const Icon = navGroups.flatMap((g) => g.items).find((i) => i.id === id)?.icon || FileText;
  return (
    <div
      className="rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center text-center"
      style={{ background: C.card, border: `1px dashed ${C.border}`, minHeight: 360 }}
    >
      <span
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{ width: 52, height: 52, background: C.tint, color: C.ink }}
      >
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h3 className="text-lg font-semibold mb-1" style={{ color: C.ink, fontFamily: FONT_HEAD }}>
        {meta.title}
      </h3>
      <p className="text-sm max-w-sm" style={{ color: C.inkSoft }}>
        هذا القسم جاهز للتصميم — سيُربط لاحقاً ببيانات {meta.title}.
      </p>
      <BrandLogo
        variant="mark"
        decorative
        className="mt-8"
        style={{ height: 28, width: 'auto', opacity: 0.28 }}
      />
    </div>
  );
}
