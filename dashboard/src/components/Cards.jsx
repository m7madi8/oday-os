import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { C, FONT_HEAD, FONT_BODY, FONT_SERIF, MONTHS_SHORT, RADIUS } from '../theme';
import { BrandLogo } from './BrandLogo';

const ICON_STROKE = 1.5;
const PLACEHOLDER_BARS = [35, 55, 40, 70, 50, 85, 60, 45, 65, 30, 75, 48];

export function StatCard({ icon: Icon, label, value, delayMs, onOpen }) {
  const Tag = onOpen ? 'button' : 'div';

  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      onClick={onOpen}
      className={`os-stat-card p-4 sm:p-5 fade-up ${onOpen ? 'os-stat-card-action' : ''}`}
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        animationDelay: `${delayMs}ms`,
        textAlign: 'start',
      }}
    >
      <div className="os-stat-top flex items-start justify-end mb-3">
        <span className="os-stat-chip">
          <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" style={{ color: C.inkSoft }} />
        </span>
        {onOpen ? (
          <ArrowUpRight className="os-stat-arrow" size={14} strokeWidth={2} aria-hidden="true" />
        ) : null}
      </div>
      <div>
        <div
          className="os-stat-number tabular-nums whitespace-nowrap overflow-hidden"
          style={{ color: C.ink, fontFamily: FONT_SERIF, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 500, lineHeight: 1.15 }}
        >
          {value}
        </div>
        <div className="os-stat-label mt-1.5" style={{ color: 'var(--c-inkSoft)', fontSize: '1.0625rem', fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </Tag>
  );
}

function HeroBars({ months }) {
  const values = (months || []).map((month) => Math.abs(Number(month.value) || 0));
  const hasData = values.some((value) => value > 0);
  const max = Math.max(...values, 1);
  const heights = hasData
    ? values.map((value) => Math.max(12, Math.round((value / max) * 100)))
    : PLACEHOLDER_BARS;
  const currentIndex = (months || []).findIndex((month) => month.tone === 'current');
  const highlightIndex = currentIndex >= 0 ? currentIndex : heights.length - 1;

  return (
    <div className="os-hero-chart" aria-hidden={!hasData}>
      <div className="os-hero-bars">
        {heights.map((height, index) => (
          <span
            key={MONTHS_SHORT[index] || index}
            className={index === highlightIndex ? 'is-current' : undefined}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="os-hero-bars-labels">
        {MONTHS_SHORT.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function FinanceCard({ kind, icon: Icon, label, value, year, delayMs, featured = false, months }) {
  const trendColor = kind === 'expense'
    ? C.burgundy
    : kind === 'income'
      ? C.emerald
      : C.inkSoft;

  return (
    <div
      className={`os-finance-card fade-up min-w-0 overflow-hidden ${featured ? 'is-hero' : ''} is-${kind} p-5 sm:p-6`}
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        animationDelay: `${delayMs}ms`,
      }}
    >
      <div className="os-finance-top flex items-center justify-between mb-5">
        {featured ? (
          <span className="os-hero-tag">
            <CalendarDays size={12} strokeWidth={2} aria-hidden="true" />
            {year}
          </span>
        ) : (
          <>
            <span className={`os-trend-chip is-${kind}`}>
              {Icon ? <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" style={{ color: trendColor }} /> : null}
            </span>
            <span className="os-trend-year text-sm" style={{ color: 'var(--c-inkSoft)', fontFamily: FONT_SERIF }}>{year}</span>
          </>
        )}
      </div>
      {featured ? (
        <div className="os-hero-label" style={{ color: 'var(--c-inkSoft)' }}>{label}</div>
      ) : null}
      <div
        className="os-finance-number tabular-nums whitespace-nowrap overflow-hidden"
        style={{
          color: C.ink,
          fontFamily: FONT_SERIF,
          fontSize: featured ? 'clamp(1.6rem, 3.6vw, 2.15rem)' : 'clamp(1.35rem, 3vw, 1.75rem)',
          fontWeight: 500,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div className={`os-finance-label mt-2 min-w-0 ${featured ? 'os-hero-label-desktop' : ''}`}>
        <span className="text-base truncate block" style={{ color: 'var(--c-inkSoft)' }}>{label}</span>
      </div>
      {featured ? <HeroBars months={months} /> : null}
    </div>
  );
}

export function MonthCard({ index, name, value, hasData, hidden, money, pad2, tone = 'future' }) {
  const isCurrent = tone === 'current';
  const opacity = isCurrent ? 1 : tone === 'past' ? 0.4 : 0.2;
  const barWidth = hasData ? '55%' : isCurrent ? '12%' : '0%';

  return (
    <div
      data-month-tone={tone}
      className="os-surface p-3 sm:p-4 flex flex-col justify-between min-w-0"
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
        minHeight: 108,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm min-w-0 truncate"
          style={{
            color: isCurrent ? C.ink : C.inkSoft,
            fontWeight: isCurrent ? 500 : 400,
          }}
        >
          {name}
        </span>
        <span
          className="text-xs tabular-nums leading-none px-1 py-1 shrink-0"
          style={{ color: C.inkSoft, borderRadius: RADIUS.sm }}
        >
          {pad2(index)}/12
        </span>
      </div>

      <div className="min-w-0">
        <div
          className="text-sm sm:text-base tabular-nums mb-2 whitespace-nowrap overflow-hidden"
          style={{
            color: isCurrent ? C.ink : C.inkSoft,
            fontFamily: FONT_SERIF,
            fontWeight: isCurrent ? 500 : 400,
            opacity: tone === 'future' ? 0.7 : 1,
          }}
        >
          {hasData ? money(value, hidden) : '—'}
        </div>
        <div className="h-1 overflow-hidden" style={{ background: C.tint, borderRadius: RADIUS.pill }}>
          <div
            className="h-full"
            style={{
              width: barWidth,
              background: C.ink,
              opacity,
              borderRadius: RADIUS.pill,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function KpiMini({ label, value, sub }) {
  return (
    <div
      className="os-surface w-full sm:flex-1 min-w-0 px-4 py-3"
      style={{
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.md,
      }}
    >
      <div className="mb-1" style={{ color: 'var(--c-inkSoft)', fontSize: '1.0625rem' }}>{label}</div>
      <div className="tabular-nums" style={{ color: C.ink, fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500 }}>{value}</div>
      {sub && <div className="mt-0.5" style={{ color: 'var(--c-inkSoft)', fontSize: '1rem' }}>{sub}</div>}
    </div>
  );
}

export function PlaceholderPage({ id, pageMeta, navGroups, FileText }) {
  const meta = pageMeta[id];
  const Icon = navGroups.flatMap((g) => g.items).find((i) => i.id === id)?.icon || FileText;
  return (
    <div
      className="os-surface p-10 sm:p-16 flex flex-col items-center justify-center text-center"
      style={{ background: C.card, border: `1px dashed ${C.border}`, minHeight: 360, borderRadius: RADIUS.md }}
    >
      <span
        className="flex items-center justify-center mb-4"
        style={{ width: 52, height: 52, background: C.tint, color: C.ink, borderRadius: RADIUS.md }}
      >
        <Icon size={24} strokeWidth={ICON_STROKE} aria-hidden="true" />
      </span>
      <h3 className="text-lg mb-1" style={{ color: C.ink, fontFamily: FONT_HEAD, fontWeight: 600 }}>
        {meta.title}
      </h3>
      <p className="text-sm max-w-sm" style={{ color: C.inkSoft, fontFamily: FONT_BODY }}>
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
