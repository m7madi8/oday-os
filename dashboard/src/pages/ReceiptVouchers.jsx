import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, Plus, ScrollText, Search } from 'lucide-react';
import { createCheque, listCheques } from '../lib/api/cheques';
import { listClients } from '../lib/api/clients';
import { createPayment, listPayments } from '../lib/api/payments';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, money } from '../theme';
import { canUser } from '../lib/permissions';
import { chequeStatusLabel, todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect } from '../components/ui/ResourcePage';
import { ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { Segmented, TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { partyColumnLabel } from '../lib/cheques/chequeMappers';
import { goToChequeDetail, goToChequeNew } from '../lib/routing/appRoutes';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function matchesSearch(row, needle, clientName) {
  if (!needle) return true;
  const hay = [
    row.number,
    row.cheque_number,
    clientName,
    row.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function ReceiptVouchers({ hidden, onOpenCheques }) {
  const { session } = useAuth();
  const [mode, setMode] = useState('cash');
  const [search, setSearch] = useState('');
  const [cashOpen, setCashOpen] = useState(false);
  const [chequeOpen, setChequeOpen] = useState(false);

  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(todayIso());
  const [chequeNumber, setChequeNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [chequeNotes, setChequeNotes] = useState('');

  const canCreate = canUser(session?.user, 'create_payment');
  const needle = search.trim().toLowerCase();

  const paymentsQuery = useQuery({
    queryKey: keys.payments('receipts-cash'),
    queryFn: () => listPayments({ per_page: 100, include: 'client' }),
    enabled: mode === 'cash',
  });
  const chequesQuery = useQuery({
    queryKey: keys.cheques('receipts-incoming'),
    queryFn: () => listCheques({ per_page: 100, direction: 'incoming', sort: 'due_date', order: 'desc' }),
    enabled: mode === 'cheque',
  });
  const clients = useQuery({
    queryKey: keys.clients('receipts-form'),
    queryFn: () => listClients({ per_page: 200 }),
  });

  const cashRows = useMemo(() => {
    const rows = paymentsQuery.data?.data || [];
    return rows
      .filter((row) => {
        const clientName = row.client?.name || '';
        if (!needle) return true;
        return matchesSearch(row, needle, clientName)
          || clientName.toLowerCase().includes(needle);
      })
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [paymentsQuery.data, needle]);

  const chequeRows = useMemo(() => {
    const rows = chequesQuery.data?.data || [];
    return rows.filter((row) => {
      const party = partyColumnLabel(row);
      return matchesSearch(row, needle, party) || party.toLowerCase().includes(needle);
    });
  }, [chequesQuery.data, needle]);

  const cashMutation = useMutation({
    mutationFn: () =>
      createPayment({
        client_id: clientId,
        amount: Number(amount) || 0,
        date: payDate || todayIso(),
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setCashOpen(false);
      setAmount('');
      setClientId('');
      setPayDate(todayIso());
      showToast('تم تسجيل سند قبض (كاش)', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const chequeMutation = useMutation({
    mutationFn: () =>
      createCheque({
        direction: 'incoming',
        client_id: clientId,
        number: chequeNumber.trim(),
        cheque_number: chequeNumber.trim(),
        amount: amount.trim(),
        issue_date: todayIso(),
        due_date: dueDate || undefined,
        notes: chequeNotes || undefined,
        currency_code: 'ILS',
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setChequeOpen(false);
      setAmount('');
      setClientId('');
      setChequeNumber('');
      setDueDate('');
      setChequeNotes('');
      showToast('تم تسجيل شيك وارد', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const loading = mode === 'cash' ? paymentsQuery.isLoading : chequesQuery.isLoading;
  const error = mode === 'cash' ? paymentsQuery.error : chequesQuery.error;
  const refetch = mode === 'cash' ? () => paymentsQuery.refetch() : () => chequesQuery.refetch();
  const shown = mode === 'cash' ? cashRows.length : chequeRows.length;

  function openCreate() {
    if (mode === 'cash') setCashOpen(true);
    else setChequeOpen(true);
  }

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            سندات القبض
          </h2>
          <p className="os-projects-header__sub">تحصيل نقدي أو شيكات واردة من العملاء — بسيط وواضح</p>
        </div>
        {canCreate ? (
          <PrimaryButton type="button" onClick={openCreate} className="os-projects-header__cta">
            <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
            {mode === 'cash' ? 'سند كاش' : 'شيك وارد'}
          </PrimaryButton>
        ) : null}
      </header>

      <div className="os-projects-panel os-projects-filters">
        <FilterField label="نوع السند">
          <Segmented
            ariaLabel="نوع السند"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'cash', label: 'كاش' },
              { id: 'cheque', label: 'شيكات' },
            ]}
          />
        </FilterField>
        {mode === 'cheque' && onOpenCheques ? (
          <div className="flex items-end">
            <GhostButton type="button" onClick={onOpenCheques}>
              <ScrollText size={16} strokeWidth={ICON} aria-hidden="true" />
              سجل الشيكات الكامل
            </GhostButton>
          </div>
        ) : null}
      </div>

      <div className="os-projects-panel os-projects-toolbar">
        <div className="os-projects-toolbar__title">
          <span className="os-projects-toolbar__dot" aria-hidden="true" />
          <div>
            <strong>{mode === 'cash' ? 'سندات الكاش' : 'شيكات واردة'}</strong>
            <span className="os-projects-toolbar__count">{shown} سند</span>
          </div>
        </div>
        <label className="os-projects-search">
          <Search size={18} strokeWidth={ICON} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالعميل أو الرقم…"
            aria-label="بحث في سندات القبض"
          />
        </label>
      </div>

      <div className="os-projects-panel os-projects-body">
        {loading ? <LoadingBlock /> : null}
        {error ? (
          <ErrorState message={error?.message} onRetry={refetch} />
        ) : null}

        {!loading && !error && mode === 'cash' && cashRows.length === 0 ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <Banknote size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">لا سندات كاش بعد</p>
            <p className="os-projects-empty__body">سجّل مبلغًا استلمته نقدًا من عميل.</p>
            {canCreate ? (
              <PrimaryButton type="button" onClick={() => setCashOpen(true)} className="mt-4">
                <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                سند كاش
              </PrimaryButton>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && mode === 'cheque' && chequeRows.length === 0 ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <ScrollText size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">لا شيكات واردة بعد</p>
            <p className="os-projects-empty__body">أضف شيكًا استلمته من عميل مع تاريخ الاستحقاق.</p>
            {canCreate ? (
              <PrimaryButton type="button" onClick={() => setChequeOpen(true)} className="mt-4">
                <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                شيك وارد
              </PrimaryButton>
            ) : null}
          </div>
        ) : null}

        {!loading && !error && mode === 'cash' && cashRows.length > 0 ? (
          <div className="os-projects-rows os-receipt-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-receipt-row" aria-hidden="true">
              <span>الرقم</span>
              <span>العميل</span>
              <span>النوع</span>
              <span>المبلغ</span>
              <span>التاريخ</span>
            </div>
            {cashRows.map((row) => (
              <div key={row.id} role="listitem" className="os-projects-row os-receipt-row">
                <span className="os-projects-row__name">{row.number || '—'}</span>
                <span>{row.client?.name || '—'}</span>
                <span className="os-receipt-type-pill">كاش</span>
                <span className="os-num">{money(row.amount || 0, hidden)}</span>
                <span className="os-projects-row__muted">{row.date || '—'}</span>
              </div>
            ))}
          </div>
        ) : null}

        {!loading && !error && mode === 'cheque' && chequeRows.length > 0 ? (
          <div className="os-projects-rows os-receipt-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-receipt-row" aria-hidden="true">
              <span>رقم الشيك</span>
              <span>العميل</span>
              <span>الحالة</span>
              <span>المبلغ</span>
              <span>الاستحقاق</span>
            </div>
            {chequeRows.map((row) => (
              <button
                key={row.id}
                type="button"
                role="listitem"
                className="os-projects-row os-receipt-row"
                onClick={() => goToChequeDetail(row.id)}
              >
                <span className="os-projects-row__name">{row.cheque_number || row.number || '—'}</span>
                <span>{partyColumnLabel(row)}</span>
                <span className="os-receipt-type-pill is-cheque">{chequeStatusLabel(row.status)}</span>
                <span className="os-num">{money(row.amount || 0, hidden)}</span>
                <span className="os-projects-row__muted">{row.due_date || row.issue_date || '—'}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet open={cashOpen} title="سند قبض — كاش" onClose={() => setCashOpen(false)}>
        <FieldBlock label="العميل">
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </FieldBlock>
        <FieldBlock label="المبلغ">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" inputMode="decimal" />
        </FieldBlock>
        <FieldBlock label="تاريخ التحصيل">
          <TextInput type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
        </FieldBlock>
        <PrimaryButton
          disabled={!clientId || !amount || cashMutation.isPending}
          loading={cashMutation.isPending}
          onClick={() => cashMutation.mutate()}
        >
          حفظ السند
        </PrimaryButton>
      </Sheet>

      <Sheet open={chequeOpen} title="سند قبض — شيك وارد" onClose={() => setChequeOpen(false)}>
        <FieldBlock label="العميل">
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </FieldBlock>
        <FieldBlock label="رقم الشيك">
          <TextInput value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
        </FieldBlock>
        <FieldBlock label="المبلغ">
          <TextInput value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" inputMode="decimal" />
        </FieldBlock>
        <FieldBlock label="تاريخ الاستحقاق">
          <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FieldBlock>
        <FieldBlock label="ملاحظة (اختياري)">
          <TextInput value={chequeNotes} onChange={(e) => setChequeNotes(e.target.value)} />
        </FieldBlock>
        <PrimaryButton
          disabled={!clientId || !amount || !chequeNumber.trim() || chequeMutation.isPending}
          loading={chequeMutation.isPending}
          onClick={() => chequeMutation.mutate()}
        >
          حفظ الشيك
        </PrimaryButton>
        {onOpenCheques ? (
          <GhostButton type="button" className="w-full mt-2" onClick={() => { setChequeOpen(false); goToChequeNew(); }}>
            نموذج شيك متقدم (طباعة ومتابعة)
          </GhostButton>
        ) : null}
      </Sheet>
    </div>
  );
}

function FieldBlock({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}
