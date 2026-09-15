import { useMemo, useState } from 'react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { C, FONT_SERIF } from '../../theme';
import { EmptyState, ErrorState, GhostButton, LoadingBlock, PrimaryButton } from './Actions';

export function ResourcePage({
  search,
  onSearch,
  searchPlaceholder = 'بحث',
  canCreate,
  createLabel,
  onCreate,
  extra,
  loading,
  error,
  onRetry,
  rows,
  columns,
  emptyTitle,
  emptyBody,
  onRowClick,
}) {
  const [copied, setCopied] = useState('');

  const table = useMemo(() => rows || [], [rows]);
  const textColumns = columns.filter((column) => !column.render);
  const actionColumns = columns.filter((column) => column.render);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <label className="relative flex-1">
          <Search size={20} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: C.inkFaint }} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="os-search w-full ps-3 pe-10 py-3 text-base min-h-11 outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: 8 }}
          />
        </label>
        <div className="flex items-center gap-2">
          {extra}
          {canCreate ? (
            <PrimaryButton onClick={onCreate}>
              <Plus size={15} />
              {createLabel}
            </PrimaryButton>
          ) : null}
        </div>
      </div>

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {!loading && !error && table.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          body={emptyBody}
          action={canCreate ? <PrimaryButton onClick={onCreate}>{createLabel}</PrimaryButton> : null}
        />
      ) : null}

      {!loading && !error && table.length > 0 ? (
        <>
          <div className="os-resource-list">
            {table.map((row) => {
              const title = textColumns[0]?.value(row) ?? '—';
              const subtitle = textColumns[1]?.value(row);
              const meta = textColumns.slice(2);
              const Tag = onRowClick ? 'button' : 'div';
              return (
                <Tag
                  key={row.id}
                  type={onRowClick ? 'button' : undefined}
                  className="os-resource-card"
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="os-resource-card-head">
                    <div className="min-w-0">
                      <div className="os-resource-card-title">{title}</div>
                      {subtitle ? <div className="os-resource-card-sub">{subtitle}</div> : null}
                    </div>
                    {onRowClick ? <ArrowUpRight size={14} strokeWidth={2} aria-hidden="true" className="os-stat-arrow" /> : null}
                  </div>
                  {meta.length ? (
                    <div className="os-resource-card-meta">
                      {meta.map((column) => (
                        <div key={column.key}>
                          <span>{column.label}</span>
                          <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{column.value(row)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {actionColumns.length ? (
                    <div className="os-resource-card-actions">
                      {actionColumns.map((column) => (
                        <div key={column.key}>{column.render(row)}</div>
                      ))}
                    </div>
                  ) : null}
                </Tag>
              );
            })}
          </div>
          <div
            className="os-resource-table overflow-auto desktop-table"
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}
          >
            <table className="w-full text-base text-start">
              <thead>
                <tr style={{ background: C.tint, color: C.inkSoft }}>
                  {columns.map((column) => (
                    <th key={column.key} className="font-semibold px-4 py-3.5 whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    onDoubleClick={() => {
                      const text = columns.map((column) => String(column.value?.(row) ?? '')).join('\t');
                      navigator.clipboard?.writeText(text);
                      setCopied(row.id);
                      window.setTimeout(() => setCopied(''), 1200);
                    }}
                    className={onRowClick ? 'cursor-pointer' : ''}
                    style={{ borderTop: `1px solid ${C.border}`, background: copied === row.id ? C.tint : 'transparent' }}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3.5 align-middle whitespace-nowrap">
                        {column.render ? column.render(row) : column.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ClientSelect({ clients, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl px-3 py-2.5 text-base min-h-11 outline-none"
      style={{ background: C.paper, border: `1px solid ${C.border}`, color: C.ink }}
    >
      <option value="">اختر العميل</option>
      {(clients || []).map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}

export { GhostButton };
