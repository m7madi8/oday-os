import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, Package, Pencil, Plus, Search } from 'lucide-react';
import {
  createEmployee,
  listEmployees,
  listPayrollPayments,
  payEmployee,
  updateEmployee,
} from '../lib/api/payroll';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, FONT_SERIF, MONTHS, YEARS, money } from '../theme';
import { canUser } from '../lib/permissions';
import { payrollMethodLabel, periodLabel, todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { Segmented, TextArea, TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import {
  approxUsdFromIls,
  filterPayrollPayments,
  resolvePayrollPeriod,
  sumPayrollAmount,
} from '../lib/payroll/payrollFilters';

const ICON = 1.5;
const JOB_TITLES = ['مهندس معماري', 'مهندس مدني', 'رسام', 'محاسب', 'سكرتير', 'مدير مكتب', 'مساح'];

const PAY_METHODS = [
  { id: 'cash', label: 'نقد' },
  { id: 'transfer', label: 'تحويل' },
  { id: 'cheque', label: 'شيك' },
];

const emptyEmployee = {
  name: '',
  job_title: '',
  phone: '',
  salary: '',
  hired_on: '',
  notes: '',
  is_active: true,
};

function FilterField({ label, children }) {
  return (
    <label className="os-projects-field">
      <span className="os-projects-field__label">{label}</span>
      {children}
    </label>
  );
}

function initialFromName(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.slice(0, 1) : 'م';
}

export function Payroll({ hidden }) {
  const { session } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState('all');
  const [view, setView] = useState('employees');
  const [filter, setFilter] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [payEmployeeId, setPayEmployeeId] = useState('');
  const [form, setForm] = useState(emptyEmployee);
  const [payForm, setPayForm] = useState({ amount: '', paid_on: todayIso(), method: 'cash', notes: '' });

  const period = useMemo(() => resolvePayrollPeriod(year, month), [year, month]);
  const canCreate = canUser(session?.user, 'create_expense');

  const query = useQuery({
    queryKey: keys.employees(`${period}|${filter}`),
    queryFn: () => listEmployees({ period, filter, per_page: 100 }),
  });
  const paymentsQuery = useQuery({
    queryKey: keys.payrollPayments('all'),
    queryFn: () => listPayrollPayments({ per_page: 300 }),
  });

  const employees = query.data?.data || [];
  const allPayments = paymentsQuery.data?.data || [];
  const filteredPayments = useMemo(
    () => filterPayrollPayments(allPayments, { year, month }),
    [allPayments, year, month],
  );
  const totalIls = useMemo(() => sumPayrollAmount(filteredPayments), [filteredPayments]);
  const totalUsd = useMemo(() => approxUsdFromIls(totalIls), [totalIls]);

  const loading = query.isLoading || paymentsQuery.isLoading;
  const shownEmployees = employees.length;
  const shownPayments = filteredPayments.length;

  const saveEmployee = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        job_title: form.job_title.trim(),
        phone: form.phone.trim(),
        salary: Number(form.salary) || 0,
        hired_on: form.hired_on || null,
        notes: form.notes.trim(),
        is_active: form.is_active,
      };
      return editing ? updateEmployee(editing.id, body) : createEmployee(body);
    },
    onSuccess: async () => {
      await invalidateFinance();
      setEmployeeOpen(false);
      setEditing(null);
      setForm(emptyEmployee);
      showToast(editing ? 'تم حفظ بيانات الموظف' : 'تم إضافة الموظف', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const payMutation = useMutation({
    mutationFn: () => {
      const targetId = paying?.id || payEmployeeId;
      if (!targetId) throw new Error('اختر الموظف');
      return payEmployee(targetId, {
        amount: Number(payForm.amount) || 0,
        period,
        paid_on: payForm.paid_on,
        method: payForm.method,
        notes: payForm.notes.trim(),
      });
    },
    onSuccess: async () => {
      await invalidateFinance();
      setPayOpen(false);
      setPaying(null);
      setPayEmployeeId('');
      showToast('تم صرف الراتب', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const payTarget = paying || employees.find((row) => row.id === payEmployeeId) || null;

  function openCreate() {
    setEditing(null);
    setForm(emptyEmployee);
    setEmployeeOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      job_title: row.job_title || '',
      phone: row.phone || '',
      salary: row.salary ? String(row.salary) : '',
      hired_on: row.hired_on || '',
      notes: row.notes || '',
      is_active: row.is_active !== false,
    });
    setEmployeeOpen(true);
  }

  function openPay(row) {
    setPaying(row);
    setPayEmployeeId(row.id);
    setPayForm({
      amount: row.salary ? String(row.salary) : '',
      paid_on: todayIso(),
      method: 'cash',
      notes: '',
    });
    setPayOpen(true);
  }

  function openQuickPay() {
    const unpaid = employees.filter((row) => !row.paid_this_period && row.is_active !== false);
    if (unpaid.length === 1) {
      openPay(unpaid[0]);
      return;
    }
    setPaying(null);
    setPayEmployeeId(unpaid[0]?.id || '');
    setPayForm({
      amount: unpaid[0]?.salary ? String(unpaid[0].salary) : '',
      paid_on: todayIso(),
      method: 'cash',
      notes: '',
    });
    setPayOpen(true);
  }

  function onPayEmployeeChange(id) {
    setPayEmployeeId(id);
    const row = employees.find((item) => item.id === id);
    if (row?.salary && !payForm.amount) {
      setPayForm((prev) => ({ ...prev, amount: String(row.salary) }));
    }
  }

  const emptyEmployees = !loading && !query.isError && view === 'employees' && employees.length === 0;
  const emptyPayments = !loading && !paymentsQuery.isError && view === 'payments' && filteredPayments.length === 0;

  return (
    <div className="os-projects min-w-0">
      <header className="os-projects-header">
        <div className="os-projects-header__copy">
          <h2 className="os-projects-header__title" style={{ fontFamily: FONT_HEAD }}>
            الرواتب
          </h2>
          <p className="os-projects-header__sub">رواتب الموظفين ودفعات الفريلانسرز</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {canCreate ? (
            <PrimaryButton type="button" onClick={openQuickPay} className="os-projects-header__cta">
              <Plus size={18} strokeWidth={ICON} aria-hidden="true" />
              دفعة راتب
            </PrimaryButton>
          ) : null}
          {canCreate ? (
            <GhostButton type="button" onClick={openCreate}>
              موظف جديد
            </GhostButton>
          ) : null}
        </div>
      </header>

      <div className="os-projects-panel os-payroll-filters">
        <div className="os-payroll-filters__grid">
          <FilterField label="السنة">
            <select className="os-projects-select" value={year} onChange={(e) => setYear(e.target.value)}>
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
          <div className="os-projects-view-toggle os-payroll-view-toggle" role="group" aria-label="طريقة العرض">
            <button
              type="button"
              className={view === 'employees' ? 'is-active' : ''}
              onClick={() => setView('employees')}
            >
              حسب الموظف
            </button>
            <button
              type="button"
              className={view === 'payments' ? 'is-active' : ''}
              onClick={() => setView('payments')}
            >
              كل الدفعات
            </button>
          </div>
        </div>
        <div className="os-payroll-total" aria-live="polite">
          <span>الإجمالي:</span>
          <strong className="os-num">{money(totalIls, hidden)}</strong>
          <span className="os-payroll-total__fx os-num">
            ≈ {hidden ? '••••' : `$${totalUsd.toFixed(2)}`}
          </span>
        </div>
      </div>

      {view === 'employees' ? (
        <div className="os-projects-panel os-projects-toolbar">
          <div className="os-projects-toolbar__title">
            <span className="os-projects-toolbar__dot" aria-hidden="true" />
            <div>
              <strong>الموظفون</strong>
              <span className="os-projects-toolbar__count">
                {periodLabel(period)} · {shownEmployees} موظف
              </span>
            </div>
          </div>
          <label className="os-projects-search">
            <Search size={18} strokeWidth={ICON} aria-hidden="true" />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="ابحث باسم الموظف…"
              aria-label="بحث في الموظفين"
            />
          </label>
        </div>
      ) : null}

      <div className="os-projects-panel os-projects-body">
        {loading ? <LoadingBlock /> : null}
        {query.isError ? <ErrorState message={query.error?.message} onRetry={() => query.refetch()} /> : null}

        {emptyEmployees || emptyPayments ? (
          <div className="os-projects-empty">
            <span className="os-projects-empty__icon" aria-hidden="true">
              <Package size={32} strokeWidth={1.25} />
            </span>
            <p className="os-projects-empty__title">ما في دفعات مسجلة</p>
            <p className="os-projects-empty__body">
              سجّل رواتب الموظفين ودفعات الفريلانسرز
            </p>
            {canCreate ? (
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <PrimaryButton type="button" onClick={openQuickPay}>
                  <Plus size={16} strokeWidth={ICON} aria-hidden="true" />
                  دفعة راتب
                </PrimaryButton>
                <GhostButton type="button" onClick={openCreate}>موظف جديد</GhostButton>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && !query.isError && view === 'employees' && employees.length > 0 ? (
          <div className="os-payroll-list os-payroll-list--inset">
            {employees.map((row) => {
              const paid = Boolean(row.paid_this_period);
              return (
                <article key={row.id} className="os-payroll-row">
                  <div className="os-payroll-identity">
                    <span className="os-payroll-avatar" aria-hidden="true">
                      {initialFromName(row.name)}
                    </span>
                    <div className="min-w-0">
                      <h3 style={{ color: C.ink, fontFamily: FONT_HEAD }}>{row.name}</h3>
                      <p style={{ color: C.inkSoft }}>
                        {row.job_title || 'بدون مسمّى'}
                        {row.is_active === false ? ' · متوقف' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="os-payroll-meta">
                    <div>
                      <span>الراتب</span>
                      <strong className="tabular-nums os-num" style={{ fontFamily: FONT_SERIF }}>
                        {money(row.salary || 0, hidden)}
                      </strong>
                    </div>
                    <div>
                      <span>{periodLabel(period)}</span>
                      <strong style={{ color: paid ? C.emerald : C.ink }}>
                        {paid ? `صُرف ${row.period_payment?.paid_on || ''}` : 'لم يُصرف'}
                      </strong>
                    </div>
                  </div>
                  <div className="os-payroll-actions">
                    {canCreate && !paid && row.is_active !== false ? (
                      <PrimaryButton type="button" onClick={() => openPay(row)}>
                        <Banknote size={15} />
                        صرف الراتب
                      </PrimaryButton>
                    ) : null}
                    {canCreate ? (
                      <GhostButton type="button" onClick={() => openEdit(row)} aria-label="تعديل الموظف">
                        <Pencil size={14} />
                        تعديل
                      </GhostButton>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && view === 'payments' && filteredPayments.length > 0 ? (
          <div className="os-projects-rows" role="list">
            <div className="os-projects-row os-projects-row--head os-projects-row--payroll" aria-hidden="true">
              <span>الموظف</span>
              <span>التاريخ</span>
              <span>الطريقة</span>
              <span>الفترة</span>
              <span>المبلغ</span>
            </div>
            {filteredPayments.map((row) => (
              <div key={row.id} role="listitem" className="os-projects-row os-projects-row--payroll">
                <span className="os-projects-row__name">{row.employee_name || '—'}</span>
                <span className="os-projects-row__muted">{row.paid_on || '—'}</span>
                <span>{payrollMethodLabel(row.method)}</span>
                <span className="os-projects-row__muted">{periodLabel(row.period) || row.period || '—'}</span>
                <span className="os-num">{money(row.amount || 0, hidden)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Sheet
        open={employeeOpen}
        title={editing ? 'تعديل الموظف' : 'موظف جديد'}
        onClose={() => setEmployeeOpen(false)}
      >
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الاسم</span>
          <TextInput value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المسمّى</span>
          <TextInput
            list="oday-job-titles"
            value={form.job_title}
            onChange={(event) => setForm((prev) => ({ ...prev, job_title: event.target.value }))}
          />
          <datalist id="oday-job-titles">
            {JOB_TITLES.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الهاتف</span>
          <TextInput value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الراتب الشهري</span>
          <TextInput
            value={form.salary}
            onChange={(event) => setForm((prev) => ({ ...prev, salary: event.target.value }))}
            className="tabular-nums"
            inputMode="decimal"
          />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>تاريخ المباشرة</span>
          <TextInput
            type="date"
            value={form.hired_on}
            onChange={(event) => setForm((prev) => ({ ...prev, hired_on: event.target.value }))}
          />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>ملاحظة</span>
          <TextArea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </label>
        {editing ? (
          <Segmented
            ariaLabel="حالة الموظف"
            value={form.is_active ? 'active' : 'inactive'}
            onChange={(value) => setForm((prev) => ({ ...prev, is_active: value === 'active' }))}
            options={[
              { id: 'active', label: 'على رأس العمل' },
              { id: 'inactive', label: 'متوقف' },
            ]}
          />
        ) : null}
        <PrimaryButton disabled={!form.name.trim() || saveEmployee.isPending} loading={saveEmployee.isPending} onClick={() => saveEmployee.mutate()}>
          {editing ? 'حفظ التعديل' : 'حفظ الموظف'}
        </PrimaryButton>
      </Sheet>

      <Sheet
        open={payOpen}
        title={payTarget ? `صرف راتب ${payTarget.name}` : 'دفعة راتب'}
        onClose={() => setPayOpen(false)}
      >
        <p className="text-base" style={{ color: C.inkSoft }}>
          {periodLabel(period)}
          {payTarget?.job_title ? ` · ${payTarget.job_title}` : ''}
        </p>
        {!paying ? (
          <label className="block">
            <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الموظف</span>
            <select
              className="os-projects-select w-full"
              value={payEmployeeId}
              onChange={(e) => onPayEmployeeChange(e.target.value)}
            >
              <option value="">اختر الموظف</option>
              {employees.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المبلغ</span>
          <TextInput
            value={payForm.amount}
            onChange={(event) => setPayForm((prev) => ({ ...prev, amount: event.target.value }))}
            className="tabular-nums"
            inputMode="decimal"
          />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>تاريخ الصرف</span>
          <TextInput
            type="date"
            value={payForm.paid_on}
            onChange={(event) => setPayForm((prev) => ({ ...prev, paid_on: event.target.value }))}
          />
        </label>
        <Segmented
          ariaLabel="طريقة الصرف"
          value={payForm.method}
          onChange={(method) => setPayForm((prev) => ({ ...prev, method }))}
          options={PAY_METHODS}
        />
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>ملاحظة</span>
          <TextArea
            rows={3}
            value={payForm.notes}
            onChange={(event) => setPayForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </label>
        <PrimaryButton
          disabled={(!paying && !payEmployeeId) || !payForm.amount || !payForm.paid_on || payMutation.isPending}
          loading={payMutation.isPending}
          onClick={() => payMutation.mutate()}
        >
          تأكيد الصرف
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
