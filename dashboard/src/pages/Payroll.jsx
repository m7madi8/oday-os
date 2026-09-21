import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Banknote, Pencil, Plus, Search } from 'lucide-react';
import {
  createEmployee,
  listEmployees,
  listPayrollPayments,
  payEmployee,
  updateEmployee,
} from '../lib/api/payroll';
import { invalidateFinance, keys } from '../lib/query';
import { C, FONT_HEAD, FONT_SERIF, MONTHS, money, RADIUS } from '../theme';
import { canUser } from '../lib/permissions';
import { currentPeriod, payrollMethodLabel, periodLabel, todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { EmptyState, ErrorState, GhostButton, LoadingBlock, PrimaryButton } from '../components/ui/Actions';
import { Segmented, TextArea, TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';

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

function periodOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const items = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(year, now.getMonth() - offset, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    items.push({ value, label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` });
  }
  return items;
}

function initialFromName(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.slice(0, 1) : 'م';
}

export function Payroll({ hidden }) {
  const { session } = useAuth();
  const [period, setPeriod] = useState(currentPeriod);
  const [filter, setFilter] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [payForm, setPayForm] = useState({ amount: '', paid_on: todayIso(), method: 'cash', notes: '' });

  const canCreate = canUser(session?.user, 'create_expense');
  const periods = useMemo(() => periodOptions(), []);

  const query = useQuery({
    queryKey: keys.employees(`${period}|${filter}`),
    queryFn: () => listEmployees({ period, filter, per_page: 50 }),
  });
  const paymentsQuery = useQuery({
    queryKey: keys.payrollPayments(period),
    queryFn: () => listPayrollPayments({ period, per_page: 20 }),
  });

  const employees = query.data?.data || [];
  const summary = query.data?.meta?.summary;
  const payments = paymentsQuery.data?.data || [];

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
    mutationFn: () =>
      payEmployee(paying.id, {
        amount: Number(payForm.amount) || 0,
        period,
        paid_on: payForm.paid_on,
        method: payForm.method,
        notes: payForm.notes.trim(),
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setPayOpen(false);
      setPaying(null);
      showToast('تم صرف الراتب', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

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
    setPayForm({
      amount: row.salary ? String(row.salary) : '',
      paid_on: todayIso(),
      method: 'cash',
      notes: '',
    });
    setPayOpen(true);
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="os-payroll-toolbar">
        <label className="relative flex-1 min-w-0">
          <Search size={20} className="absolute end-3 top-1/2 -translate-y-1/2" style={{ color: C.inkFaint }} />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="ابحث باسم الموظف"
            className="os-search w-full ps-3 pe-10 py-3 text-base min-h-11 outline-none"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: 8 }}
          />
        </label>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          aria-label="شهر الراتب"
          className="os-payroll-period"
          style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink, borderRadius: RADIUS.md }}
        >
          {periods.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        {canCreate ? (
          <PrimaryButton onClick={openCreate}>
            <Plus size={15} />
            موظف جديد
          </PrimaryButton>
        ) : null}
      </div>

      {summary ? (
        <div className="os-payroll-summary" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div>
            <span>الفريق</span>
            <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{summary.employee_count}</strong>
          </div>
          <div>
            <span>صُرف</span>
            <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{summary.paid_count}</strong>
          </div>
          <div>
            <span>متبقي</span>
            <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{summary.unpaid_count}</strong>
          </div>
          <div>
            <span>رواتب الشهر</span>
            <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{money(summary.salary_total || 0, hidden)}</strong>
          </div>
        </div>
      ) : null}

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState message={query.error?.message} onRetry={() => query.refetch()} /> : null}

      {!query.isLoading && !query.isError && employees.length === 0 ? (
        <EmptyState
          title="لم يُضف أحد بعد"
          body="أضف الموظف أو الموظفة هنا، ثم اصرف الراتب بضغطة واحدة."
          action={canCreate ? <PrimaryButton onClick={openCreate}>موظف جديد</PrimaryButton> : null}
        />
      ) : null}

      {!query.isLoading && !query.isError && employees.length > 0 ? (
        <div className="os-payroll-list">
          {employees.map((row) => {
            const paid = Boolean(row.paid_this_period);
            return (
              <article key={row.id} className="os-payroll-row" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="os-payroll-identity">
                  <span className="os-payroll-avatar" aria-hidden="true" style={{ background: C.tint, color: C.ink }}>
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
                    <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{money(row.salary || 0, hidden)}</strong>
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
                    <PrimaryButton onClick={() => openPay(row)}>
                      <Banknote size={15} />
                      صرف الراتب
                    </PrimaryButton>
                  ) : null}
                  {canCreate ? (
                    <GhostButton onClick={() => openEdit(row)} aria-label="تعديل الموظف">
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

      {payments.length > 0 ? (
        <section className="os-payroll-history" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <h3 style={{ color: C.ink, fontFamily: FONT_HEAD }}>صرف {periodLabel(period)}</h3>
          <ul>
            {payments.map((row) => (
              <li key={row.id}>
                <span>{row.employee_name || 'موظف'}</span>
                <span className="os-payroll-history-meta">
                  {payrollMethodLabel(row.method)} · {row.paid_on}
                </span>
                <strong className="tabular-nums" style={{ fontFamily: FONT_SERIF }}>{money(row.amount || 0, hidden)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
        title={paying ? `صرف راتب ${paying.name}` : 'صرف الراتب'}
        onClose={() => setPayOpen(false)}
      >
        <p className="text-base" style={{ color: C.inkSoft }}>
          {periodLabel(period)}
          {paying?.job_title ? ` · ${paying.job_title}` : ''}
        </p>
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
          disabled={!payForm.amount || !payForm.paid_on || payMutation.isPending}
          loading={payMutation.isPending}
          onClick={() => payMutation.mutate()}
        >
          تأكيد الصرف
        </PrimaryButton>
      </Sheet>
    </div>
  );
}
