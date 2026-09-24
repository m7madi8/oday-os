import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Package, Plus, Printer, Search } from 'lucide-react';
import { createInvoice, downloadInvoicePdf, listInvoices } from '../lib/api/invoices';
import { listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, MONTHS, YEARS, money } from '../theme';
import { canUser } from '../lib/permissions';
import { invoiceStatusLabel, todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect } from '../components/ui/ResourcePage';
import { ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { openOrSaveBlob } from '../lib/files';
import {
  INVOICE_SORT_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  collectInvoiceTags,
  filterAndSortInvoices,
} from '../lib/invoices/invoiceFilters';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

export function Invoices({ hidden }) {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [status, setStatus] = useState('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState('newest');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('أتعاب هندسية');

  const query = useQuery({
    queryKey: keys.invoices('all-list'),
    queryFn: () => listInvoices({ per_page: 200, include: 'client' }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 200 }) });

  const allRows = query.data?.data || [];
  const tagOptions = useMemo(() => collectInvoiceTags(allRows), [allRows]);

  const filtered = useMemo(
    () => filterAndSortInvoices(allRows, { year, month, status, tag, search, sort }),
    [allRows, year, month, status, tag, search, sort],
  );

  const canCreate = canUser(session?.user, 'create_invoice');
  const total = allRows.length;
  const shown = filtered.length;

  const mutation = useMutation({
    mutationFn: () =>
      createInvoice({
        client_id: clientId,
        date: todayIso(),
        line_items: [{ quantity: 1, cost: Number(cost) || 0, notes, product_key: notes }],
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setCost('');
      showToast('تم إنشاء الفاتورة', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  async function printRow(row) {
    try {
      const blob = await downloadInvoicePdf(row.id);
      await openOrSaveBlob(blob, `${row.number || 'invoice'}.pdf`, { print: true });
    } catch (error) {
      showToast(error.message || 'تعذر تحميل PDF من الخادم', 'error');
    }
  }

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            الفواتير
          </h2>
          <p className="os-projects-header__sub">إصدار الفواتير ومتابعة التحصيل</p>
        </div>
        {canCreate ? (
          <PrimaryButton type="button" onClick={() => setOpen(true)} className="os-projects-header__cta">
            <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
            فاتورة جديدة
          </PrimaryButton>
        ) : null}
      </header>

      <div className="os-projects-panel os-invoices-filters">
        <div className="os-invoices-filters__grid">
          <FilterField label="الحالة">
            <select className="os-projects-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {INVOICE_STATUS_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="السنة">
            <select className="os-projects-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">كل السنوات</option>
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
          <FilterField label="الترتيب">
            <select className="os-projects-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {INVOICE_SORT_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </FilterField>
          {tagOptions.length ? (
            <FilterField label="السمات">
              <select className="os-projects-select" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="all">كل السمات</option>
                {tagOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </FilterField>
          ) : null}
        </div>
      </div>

      <div className="os-projects-panel os-projects-toolbar">
        <div className="os-projects-toolbar__title">
          <span className="os-projects-toolbar__dot" aria-hidden="true" />
          <div>
            <strong>الفواتير</strong>
            <span className="os-projects-toolbar__count">
              عرض {shown} من {total} فاتورة
            </span>
          </div>
        </div>
        <label className="os-projects-search">
          <Search size={18} strokeWidth={ICON} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو العميل…"
            aria-label="بحث في الفواتير"
          />
        </label>
        <span className="os-projects-badge os-num" aria-label={`${shown} من ${total}`}>
          {shown}/{total}
        </span>
      </div>

      <div className="os-projects-panel os-projects-body">
        {query.isLoading ? <LoadingBlock /> : null}
        {query.isError ? (
          <ErrorState error={query.error} message={query.error?.message} onRetry={() => query.refetch()} />
        ) : null}

        {!query.isLoading && !query.isError && filtered.length === 0 ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <Package size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">ما في فواتير هون</p>
            <p className="os-projects-empty__body">
              أنشئ فاتورة جديدة وتابع تحصيلها
            </p>
            {canCreate ? (
              <PrimaryButton type="button" onClick={() => setOpen(true)} className="mt-4">
                <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                فاتورة جديدة
              </PrimaryButton>
            ) : null}
          </div>
        ) : null}

        {!query.isLoading && !query.isError && filtered.length > 0 ? (
          <div className="os-projects-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-projects-row--invoices" aria-hidden="true">
              <span>الرقم</span>
              <span>العميل</span>
              <span>التاريخ</span>
              <span>الحالة</span>
              <span>المبلغ</span>
              <span>المتبقي</span>
              <span />
            </div>
            {filtered.map((row) => (
              <div key={row.id} role="listitem" className="os-projects-row os-projects-row--invoices">
                <span className="os-projects-row__name os-num">{row.number || '—'}</span>
                <span>{row.client?.name || '—'}</span>
                <span className="os-projects-row__muted">{row.date || '—'}</span>
                <span>
                  <span className="os-invoice-status-pill">{invoiceStatusLabel(row.status_id)}</span>
                </span>
                <span className="os-num">{money(row.amount || 0, hidden)}</span>
                <span className="os-num">{money(row.balance || 0, hidden)}</span>
                <span className="os-invoices-row-actions">
                  <GhostButton type="button" onClick={() => printRow(row)} aria-label="تنزيل PDF">
                    <Printer size={14} strokeWidth={ICON} />
                    PDF
                  </GhostButton>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet open={open} title="إنشاء فاتورة" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>العميل</span>
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المبلغ</span>
          <TextInput value={cost} onChange={(event) => setCost(event.target.value)} className="tabular-nums" />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>البيان</span>
          <TextInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <PrimaryButton disabled={!clientId || !cost || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          إنشاء الفاتورة
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
