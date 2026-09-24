import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArchiveX, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { FONT_HEAD, YEARS, money } from '../theme';
import { keys } from '../lib/query';
import { Sheet } from '../components/ui/Sheet';
import { GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import {
  DEAD_DEBT_SORT_OPTIONS,
  filterAndSortDeadDebts,
  sumDeadDebtAmounts,
} from '../lib/deadDebts/deadDebtFilters';
import {
  createDeadDebtId,
  loadDeadDebts,
  normalizeDeadDebt,
  saveDeadDebts,
} from '../lib/deadDebts/deadDebtStorage';

const ICON = 1.65;
const YEAR_OPTIONS = [...new Set([...YEARS, 2023, 2022, 2021, 2020, 2019, 2018])].sort((a, b) => b - a);

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function emptyForm() {
  return {
    id: '',
    client_name: '',
    amount: '',
    debt_year: String(new Date().getFullYear() - 3),
    notes: '',
  };
}

export function DeadDebts({ hidden }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [sort, setSort] = useState('amount');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const query = useQuery({
    queryKey: keys.deadDebts(),
    queryFn: loadDeadDebts,
  });

  const allRows = query.data || [];
  const filtered = useMemo(
    () => filterAndSortDeadDebts(allRows, { year, search, sort }),
    [allRows, year, search, sort],
  );
  const totalAmount = useMemo(() => sumDeadDebtAmounts(filtered), [filtered]);
  const grandTotal = useMemo(() => sumDeadDebtAmounts(allRows), [allRows]);

  const persist = useMutation({
    mutationFn: async (nextRows) => {
      await saveDeadDebts(nextRows);
      return nextRows;
    },
    onSuccess: (nextRows) => {
      queryClient.setQueryData(keys.deadDebts(), nextRows);
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (error) => showToast(error.message || 'تعذر الحفظ', 'error'),
  });

  function openCreate() {
    setForm({ ...emptyForm(), id: '' });
    setOpen(true);
  }

  function openEdit(row) {
    setForm({
      id: row.id,
      client_name: row.client_name || '',
      amount: String(row.amount ?? ''),
      debt_year: row.debt_year ? String(row.debt_year) : '',
      notes: row.notes || '',
    });
    setOpen(true);
  }

  function handleSave() {
    const name = form.client_name.trim();
    if (!name) {
      showToast('أدخل اسم العميل أو الجهة', 'error');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      showToast('أدخل مبلغًا صحيحًا', 'error');
      return;
    }

    const payload = normalizeDeadDebt({
      id: form.id || createDeadDebtId(),
      client_name: name,
      amount,
      debt_year: form.debt_year,
      notes: form.notes,
      created_at: form.id
        ? allRows.find((r) => r.id === form.id)?.created_at
        : Date.now(),
    });

    const next = form.id
      ? allRows.map((row) => (row.id === form.id ? payload : row))
      : [payload, ...allRows];

    persist.mutate(next, {
      onSuccess: () => showToast(form.id ? 'تم تحديث السجل' : 'تمت إضافة الدين', 'ok'),
    });
  }

  function handleDelete(row) {
    if (!window.confirm(`حذف سجل «${row.client_name}» من الديون الميتة؟`)) return;
    const next = allRows.filter((item) => item.id !== row.id);
    persist.mutate(next, { onSuccess: () => showToast('تم الحذف', 'ok') });
  }

  if (query.isLoading) return <LoadingBlock />;

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            الديون الميتة القديمة
          </h2>
          <p className="os-projects-header__sub">
            سجل مستقل للمستحقات القديمة غير المحتمل تحصيلها — لا تُحسب ضمن الفواتير المفتوحة
          </p>
        </div>
        <PrimaryButton type="button" onClick={openCreate} className="os-projects-header__cta">
          <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
          إضافة دين
        </PrimaryButton>
      </header>

      <div className="os-dead-debts-summary os-projects-panel" role="status">
        <div className="os-dead-debts-summary__item">
          <span>إجمالي السجل</span>
          <strong className="os-num">{money(grandTotal, hidden)}</strong>
        </div>
        <div className="os-dead-debts-summary__item">
          <span>المعروض بعد التصفية</span>
          <strong className="os-num">{money(totalAmount, hidden)}</strong>
        </div>
        <div className="os-dead-debts-summary__item">
          <span>عدد السجلات</span>
          <strong className="os-num">{filtered.length}</strong>
        </div>
      </div>

      <div className="os-projects-panel os-dead-debts-filters">
        <div className="os-dead-debts-filters__grid">
          <FilterField label="سنة الدين">
            <select className="os-projects-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">كل السنوات</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </FilterField>
          <FilterField label="ترتيب">
            <select className="os-projects-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {DEAD_DEBT_SORT_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </FilterField>
        </div>
      </div>

      <div className="os-projects-panel">
        <div className="os-projects-toolbar">
          <div className="os-projects-toolbar__title">
            <strong>السجلات</strong>
            <span className="os-projects-toolbar__count">
              {filtered.length} من {allRows.length}
            </span>
          </div>
          <label className="os-projects-search">
            <Search size={16} strokeWidth={ICON} aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالعميل أو الملاحظة…"
              aria-label="بحث في الديون الميتة"
            />
          </label>
        </div>

        <div className="os-projects-body">
          {filtered.length === 0 ? (
            <div className="os-projects-empty">
              <div className="os-projects-empty__icon" aria-hidden="true">
                <ArchiveX size={22} strokeWidth={ICON} />
              </div>
              <p className="os-projects-empty__title">لا سجلات بعد</p>
              <p className="os-projects-empty__body">
                أضف الديون القديمة التي قررت عدم متابعتها في التحصيل اليومي.
              </p>
              <PrimaryButton type="button" onClick={openCreate} className="mt-4">
                <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
                إضافة أول دين
              </PrimaryButton>
            </div>
          ) : (
            <div className="os-projects-rows os-dead-debts-rows">
              <div className="os-projects-row os-projects-row--head os-dead-debts-row" aria-hidden="true">
                <span>العميل / الجهة</span>
                <span>سنة الدين</span>
                <span>المبلغ</span>
                <span>ملاحظة</span>
                <span />
              </div>
              {filtered.map((row) => (
                <div key={row.id} className="os-dead-debts-row os-projects-row">
                  <span className="os-projects-row__name">{row.client_name}</span>
                  <span className="os-projects-row__muted os-num">{row.debt_year || '—'}</span>
                  <span className="os-num" style={{ fontWeight: 600 }}>{money(row.amount, hidden)}</span>
                  <span className="os-projects-row__muted truncate">{row.notes || '—'}</span>
                  <span className="os-dead-debts-row__actions">
                    <button
                      type="button"
                      className="os-icon-btn os-dead-debts-icon-btn"
                      aria-label={`تعديل ${row.client_name}`}
                      onClick={() => openEdit(row)}
                    >
                      <Pencil size={16} strokeWidth={ICON} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="os-icon-btn os-dead-debts-icon-btn os-dead-debts-icon-btn--danger"
                      aria-label={`حذف ${row.client_name}`}
                      onClick={() => handleDelete(row)}
                    >
                      <Trash2 size={16} strokeWidth={ICON} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'تعديل دين ميت' : 'دين ميت قديم'}
        footer={
          <>
            <GhostButton type="button" onClick={() => setOpen(false)}>إلغاء</GhostButton>
            <PrimaryButton
              type="button"
              loading={persist.isPending}
              disabled={persist.isPending}
              onClick={handleSave}
            >
              حفظ
            </PrimaryButton>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>العميل / الجهة</span>
            <TextInput
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              placeholder="مثال: شركة البناء القديمة"
              className="mt-1.5 w-full"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>المبلغ</span>
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1.5 w-full os-num"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>سنة الدين</span>
              <select
                className="os-projects-select mt-1.5 w-full"
                value={form.debt_year}
                onChange={(e) => setForm((f) => ({ ...f, debt_year: e.target.value }))}
              >
                <option value="">غير محدد</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold" style={{ color: 'var(--c-ink)' }}>ملاحظة</span>
            <TextInput
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="مشروع، سبب الشطب، مرجع فاتورة قديمة…"
              className="mt-1.5 w-full"
            />
          </label>
        </div>
      </Sheet>
    </div>
  );
}
