import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';
import { C, FONT_SERIF, money } from '../../theme';
import { EmptyState, ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../../components/ui/Actions';
import { ChequeSummaryOverview } from '../../components/cheques/ChequeSummaryOverview';
import { ChequePreviewPanel } from '../../components/cheques/ChequePreviewPanel';
import { ChequeStatusIndicator, ChequeDirectionBadge } from '../../components/cheques/ChequeStatusIndicator';
import { listCheques, fetchChequeSummary, getCheque } from '../../lib/api/cheques';
import { keys } from '../../lib/query';
import { parseChequeListQuery, serializeChequeListQuery, listQueryKey } from '../../lib/cheques/listQuery';
import {
  getAppSearchParams,
  goToChequeDetail,
  goToChequeList,
  goToChequeNew,
} from '../../lib/routing/appRoutes';
import {
  mapChequeToPreviewData,
  normalizeListRow,
  partyColumnLabel,
  templateForChequeRow,
} from '../../lib/cheques/chequeMappers';
import { palestinianBanks } from '../../data/palestinianBanks';
import { chequeStatusLabel } from '../../lib/labels';

const SORTABLE = [
  { key: 'due_date', label: 'تاريخ الاستحقاق' },
  { key: 'issue_date', label: 'تاريخ الإصدار' },
  { key: 'number', label: 'رقم الشيك' },
  { key: 'amount_minor', label: 'المبلغ' },
  { key: 'status', label: 'الحالة' },
];

export function ChequeRegisterPage({ hidden, canCreate, selectedId, onSelectId }) {
  const [searchParams, setSearchParams] = useState(() => getAppSearchParams());
  const listState = useMemo(() => parseChequeListQuery(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(listState.filter);
  const searchDebounce = useRef(null);

  useEffect(() => {
    setSearchParams(getAppSearchParams());
    function refresh() {
      setSearchParams(getAppSearchParams());
    }
    window.addEventListener('popstate', refresh);
    window.addEventListener('oday-route-change', refresh);
    return () => {
      window.removeEventListener('popstate', refresh);
      window.removeEventListener('oday-route-change', refresh);
    };
  }, []);

  const updateQuery = useCallback((patch, replace = false) => {
    const next = { ...listState, ...patch };
    goToChequeList(serializeChequeListQuery(next), replace);
    setSearchParams(getAppSearchParams());
  }, [listState]);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      if (searchInput !== listState.filter) {
        updateQuery({ filter: searchInput, page: 1 });
      }
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchInput, listState.filter, updateQuery]);

  const listQuery = useQuery({
    queryKey: keys.cheques(listQueryKey(listState)),
    queryFn: () =>
      listCheques({
        page: listState.page,
        per_page: listState.per_page,
        filter: listState.filter,
        direction: listState.direction,
        status: listState.status,
        bank_id: listState.bank_id,
        currency: listState.currency,
        overdue: listState.overdue,
        client_id: listState.client_id,
        project_id: listState.project_id,
        sort: listState.sort,
        order: listState.order,
      }),
  });

  const direction = listState.direction || 'all';
  const summaryIncoming = useQuery({
    queryKey: keys.chequeSummary('incoming'),
    queryFn: () => fetchChequeSummary('incoming'),
    enabled: direction === 'all',
  });
  const summaryOutgoing = useQuery({
    queryKey: keys.chequeSummary('outgoing'),
    queryFn: () => fetchChequeSummary('outgoing'),
    enabled: direction === 'all',
  });
  const summarySingle = useQuery({
    queryKey: keys.chequeSummary(direction),
    queryFn: () => fetchChequeSummary(direction),
    enabled: direction !== 'all',
  });

  const rows = useMemo(
    () => (listQuery.data?.data || []).map(normalizeListRow),
    [listQuery.data],
  );

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId],
  );

  const selectedDetail = useQuery({
    queryKey: keys.cheque(selectedId),
    queryFn: () => getCheque(selectedId),
    enabled: Boolean(selectedId),
  });

  const previewCheque = selectedDetail.data?.data || selectedRow;
  const previewData = previewCheque ? mapChequeToPreviewData(previewCheque) : null;
  const previewTemplate = previewCheque ? templateForChequeRow(previewCheque) : null;

  const pagination = listQuery.data?.meta?.pagination;
  const [focusIndex, setFocusIndex] = useState(0);


  function onKeyNav(event) {
    if (!rows.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(rows.length - 1, focusIndex + 1);
      setFocusIndex(next);
      onSelectId?.(rows[next].id);
      goToChequeDetail(rows[next].id, true);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.max(0, focusIndex - 1);
      setFocusIndex(next);
      onSelectId?.(rows[next].id);
      goToChequeDetail(rows[next].id, true);
    }
  }

  const chips = [];
  if (listState.direction !== 'all') chips.push({ key: 'direction', label: listState.direction === 'incoming' ? 'وارد' : 'صادر' });
  if (listState.status) chips.push({ key: 'status', label: chequeStatusLabel(listState.status) });
  if (listState.bank_id) {
    const bank = palestinianBanks.find((b) => b.id === listState.bank_id);
    chips.push({ key: 'bank_id', label: bank?.nameAr || listState.bank_id });
  }
  if (listState.overdue) chips.push({ key: 'overdue', label: 'متأخر' });
  if (listState.currency) chips.push({ key: 'currency', label: listState.currency });

  return (
    <div className="cheque-register space-y-5 min-w-0" onKeyDown={onKeyNav}>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: FONT_SERIF }}>الشيكات</h1>
        <p className="text-base" style={{ color: C.inkSoft }}>
          إدارة ومتابعة الشيكات الواردة والصادرة وحالات استحقاقها.
        </p>
      </header>

      <ChequeSummaryOverview
        direction={direction}
        incomingSummary={summaryIncoming.data?.data}
        outgoingSummary={summaryOutgoing.data?.data}
        allSummary={summarySingle.data?.data}
        loading={
          (direction === 'all' && (summaryIncoming.isLoading || summaryOutgoing.isLoading))
          || (direction !== 'all' && summarySingle.isLoading)
        }
        error={
          summaryIncoming.error?.message
          || summaryOutgoing.error?.message
          || summarySingle.error?.message
        }
        onRetry={() => {
          summaryIncoming.refetch();
          summaryOutgoing.refetch();
          summarySingle.refetch();
        }}
        hidden={hidden}
      />

      <div className="flex flex-col lg:flex-row gap-3">
        <label className="relative flex-1">
          <Search size={20} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: C.inkFaint }} aria-hidden="true" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ابحث برقم الشيك أو البنك أو الجهة"
            className="os-search w-full ps-3 pe-10 py-3 text-base min-h-11 outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: 8 }}
          />
        </label>
        {canCreate ? (
          <PrimaryButton type="button" className="min-h-11" onClick={() => goToChequeNew()}>
            <Plus size={16} />
            إضافة شيك
          </PrimaryButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <FilterChip active={listState.direction === 'all'} onClick={() => updateQuery({ direction: 'all', page: 1 })}>
          كل الشيكات
        </FilterChip>
        <FilterChip active={listState.direction === 'incoming'} onClick={() => updateQuery({ direction: 'incoming', page: 1 })}>
          وارد
        </FilterChip>
        <FilterChip active={listState.direction === 'outgoing'} onClick={() => updateQuery({ direction: 'outgoing', page: 1 })}>
          صادر
        </FilterChip>
        <FilterChip active={listState.overdue} onClick={() => updateQuery({ overdue: !listState.overdue, page: 1 })}>
          متأخر
        </FilterChip>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 min-h-11 text-sm cursor-pointer"
              style={{ background: C.tint, border: `1px solid ${C.border}` }}
              onClick={() => updateQuery({ [chip.key]: chip.key === 'overdue' ? false : '', page: 1 })}
            >
              {chip.label}
              <X size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {listQuery.isLoading ? <LoadingBlock /> : null}
      {listQuery.isError ? <ErrorState message={listQuery.error?.message} onRetry={() => listQuery.refetch()} /> : null}

      {!listQuery.isLoading && !listQuery.isError && rows.length === 0 ? (
        <EmptyState
          title="لا توجد شيكات بعد"
          body="ابدأ بتسجيل شيك وارد أو صادر لمتابعة الاستحقاق والتحصيل."
          action={canCreate ? <PrimaryButton onClick={() => goToChequeNew()}>إضافة شيك</PrimaryButton> : null}
        />
      ) : null}

      {rows.length ? (
        <div className="cheque-register-layout grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] min-w-0">
          <div className="min-w-0 space-y-3">
            <div className="os-resource-list cheque-mobile-cards">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="os-resource-card w-full text-start cursor-pointer min-h-11"
                  aria-selected={row.id === selectedId}
                  onClick={() => {
                    onSelectId?.(row.id);
                    goToChequeDetail(row.id);
                  }}
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-semibold tabular-nums" dir="ltr">{row.number}</div>
                      <div className="text-sm" style={{ color: C.inkSoft }}>{partyColumnLabel(row)}</div>
                    </div>
                    <div className="text-end">
                      <div className="tabular-nums font-semibold" dir="ltr">{money(row.amount, hidden)}</div>
                      <ChequeStatusIndicator status={row.status} overdue={row.is_overdue} compact />
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs mt-2" style={{ color: C.inkFaint }}>
                    <ChequeDirectionBadge direction={row.direction} />
                    <span dir="ltr">{row.due_date || '—'}</span>
                  </div>
                </button>
              ))}
            </div>

            <div
              className="cheque-desktop-table os-resource-table overflow-auto hidden xl:block"
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: 'min(70vh, 720px)' }}
            >
              <table className="w-full text-base text-start">
                <thead className="sticky top-0 z-10" style={{ background: C.tint }}>
                  <tr style={{ color: C.inkSoft }}>
                    {[
                      ['direction', 'الاتجاه'],
                      ['party', 'العميل/الجهة'],
                      ['project', 'المشروع'],
                      ['bank', 'البنك'],
                      ['number', 'رقم الشيك'],
                      ['amount', 'المبلغ'],
                      ['currency', 'العملة'],
                      ['due', 'تاريخ الاستحقاق'],
                      ['status', 'الحالة'],
                    ].map(([key, label]) => {
                      const sortable = SORTABLE.find((s) => s.key === key || (key === 'due' && s.key === 'due_date') || (key === 'number' && s.key === 'number'));
                      const sortKey = key === 'due' ? 'due_date' : key === 'number' ? 'number' : sortable?.key;
                      return (
                        <th key={key} className="font-semibold px-3 py-3 whitespace-nowrap">
                          {sortKey && SORTABLE.some((s) => s.key === sortKey) ? (
                            <button
                              type="button"
                              className="cursor-pointer min-h-11 underline-offset-2 hover:underline"
                              onClick={() => {
                                const order = listState.sort === sortKey && listState.order === 'asc' ? 'desc' : 'asc';
                                updateQuery({ sort: sortKey, order });
                              }}
                            >
                              {label}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const selected = row.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        tabIndex={0}
                        aria-selected={selected}
                        className="cursor-pointer focus-visible:outline focus-visible:outline-2"
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          background: selected ? C.tint : 'transparent',
                        }}
                        onClick={() => {
                          setFocusIndex(index);
                          onSelectId?.(row.id);
                          goToChequeDetail(row.id);
                        }}
                        onFocus={() => setFocusIndex(index)}
                      >
                        <td className="px-3 py-3"><ChequeDirectionBadge direction={row.direction} /></td>
                        <td className="px-3 py-3">{partyColumnLabel(row)}</td>
                        <td className="px-3 py-3">{row.project_name || '—'}</td>
                        <td className="px-3 py-3">{row.bank_label}</td>
                        <td className="px-3 py-3 tabular-nums" dir="ltr">{row.number}</td>
                        <td className="px-3 py-3 tabular-nums text-end" dir="ltr">{money(row.amount, hidden)}</td>
                        <td className="px-3 py-3 tabular-nums" dir="ltr">{row.currency}</td>
                        <td className="px-3 py-3 tabular-nums" dir="ltr">{row.due_date || '—'}</td>
                        <td className="px-3 py-3">
                          <ChequeStatusIndicator status={row.status} overdue={row.is_overdue} compact />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total_pages > 1 ? (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <GhostButton
                  type="button"
                  className="min-h-11"
                  disabled={listState.page <= 1}
                  onClick={() => updateQuery({ page: listState.page - 1 })}
                >
                  السابق
                </GhostButton>
                <span className="text-sm tabular-nums" style={{ color: C.inkSoft }} dir="ltr">
                  {listState.page} / {pagination.total_pages}
                </span>
                <GhostButton
                  type="button"
                  className="min-h-11"
                  disabled={listState.page >= pagination.total_pages}
                  onClick={() => updateQuery({ page: listState.page + 1 })}
                >
                  التالي
                </GhostButton>
              </div>
            ) : null}
          </div>

          <aside className="cheque-register-preview hidden xl:block sticky top-4 self-start min-w-0">
            {previewCheque && previewTemplate ? (
              <ChequePreviewPanel
                direction={previewCheque.direction}
                data={previewData}
                template={previewTemplate}
                loading={selectedDetail.isLoading && !selectedRow}
              />
            ) : (
              <p className="text-sm" style={{ color: C.inkSoft }}>اختر شيكًا من الجدول لمعاينته.</p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-4 py-2 min-h-11 text-sm font-medium cursor-pointer transition-colors duration-200"
      style={{
        background: active ? C.ink : C.card,
        color: active ? C.paper : C.inkSoft,
        border: `1px solid ${C.border}`,
      }}
    >
      {children}
    </button>
  );
}
