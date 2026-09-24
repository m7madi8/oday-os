import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Package, Plus, Search } from 'lucide-react';
import { createExpense, listExpenses } from '../lib/api/expenses';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, MONTHS, YEARS, money } from '../theme';
import { canUser } from '../lib/permissions';
import { todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ErrorState, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import {
  EXPENSE_TYPE_OPTIONS,
  expenseKind,
  filterExpenses,
  sumExpenseAmounts,
} from '../lib/expenses/expenseFilters';

const ICON = 1.5;

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function typeLabel(row) {
  return expenseKind(row) === 'project' ? 'مشروع' : 'مكتب';
}

export function Expenses({ hidden }) {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [type, setType] = useState('all');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const query = useQuery({
    queryKey: keys.expenses('all-list'),
    queryFn: () => listExpenses({ per_page: 200, include: 'project,category' }),
  });

  const allRows = query.data?.data || [];
  const filtered = useMemo(
    () => filterExpenses(allRows, { year, month, type, search }),
    [allRows, year, month, type, search],
  );
  const totalAmount = useMemo(() => sumExpenseAmounts(filtered), [filtered]);

  const canCreate = canUser(session?.user, 'create_expense');
  const total = allRows.length;
  const shown = filtered.length;

  const mutation = useMutation({
    mutationFn: () =>
      createExpense({
        amount: Number(amount) || 0,
        date: todayIso(),
        public_notes: notes,
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setAmount('');
      setNotes('');
      showToast('تم حفظ المصروف', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            المصاريف
          </h2>
          <p className="os-projects-header__sub">مصاريف المكتب والمشاريع</p>
        </div>
        {canCreate ? (
          <PrimaryButton type="button" onClick={() => setOpen(true)} className="os-projects-header__cta">
            <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
            مصروف جديد
          </PrimaryButton>
        ) : null}
      </header>

      <div className="os-projects-panel os-expenses-filters">
        <div className="os-expenses-filters__grid">
          <FilterField label="النوع">
            <select className="os-projects-select" value={type} onChange={(e) => setType(e.target.value)}>
              {EXPENSE_TYPE_OPTIONS.map((item) => (
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
        </div>
        <div className="os-expenses-total" aria-live="polite">
          <span>الإجمالي:</span>
          <strong className="os-num">{money(totalAmount, hidden)}</strong>
        </div>
      </div>

      <div className="os-projects-panel os-projects-toolbar">
        <div className="os-projects-toolbar__title">
          <span className="os-projects-toolbar__dot" aria-hidden="true" />
          <div>
            <strong>المصاريف</strong>
            <span className="os-projects-toolbar__count">
              عرض {shown} من {total} مصروف
            </span>
          </div>
        </div>
        <label className="os-projects-search">
          <Search size={18} strokeWidth={ICON} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في البيان أو المشروع…"
            aria-label="بحث في المصاريف"
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
            <p className="os-projects-empty__title">ما في مصاريف مطابقة</p>
            <p className="os-projects-empty__body">
              سجّل مصاريف المكتب والمشاريع لتتبعها
            </p>
            {canCreate ? (
              <PrimaryButton type="button" onClick={() => setOpen(true)} className="mt-4">
                <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                مصروف جديد
              </PrimaryButton>
            ) : null}
          </div>
        ) : null}

        {!query.isLoading && !query.isError && filtered.length > 0 ? (
          <div className="os-projects-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-projects-row--expenses" aria-hidden="true">
              <span>التاريخ</span>
              <span>البيان</span>
              <span>النوع</span>
              <span>المشروع</span>
              <span>المبلغ</span>
            </div>
            {filtered.map((row) => (
              <div key={row.id} role="listitem" className="os-projects-row os-projects-row--expenses">
                <span className="os-projects-row__muted">{row.date || '—'}</span>
                <span className="os-projects-row__name">
                  {row.public_notes || row.private_notes || row.number || '—'}
                </span>
                <span>
                  <span className="os-expense-type-pill">{typeLabel(row)}</span>
                </span>
                <span className="os-projects-row__muted">{row.project?.name || '—'}</span>
                <span className="os-num">{money(row.amount || 0, hidden)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet open={open} title="إضافة مصروف" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المبلغ</span>
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>البيان</span>
          <TextInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <PrimaryButton disabled={!amount || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          حفظ المصروف
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
