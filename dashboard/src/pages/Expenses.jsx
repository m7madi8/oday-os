import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createExpense, listExpenses } from '../lib/api/expenses';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { C } from '../theme';
import { canUser } from '../lib/permissions';
import { todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ResourcePage } from '../components/ui/ResourcePage';
import { PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';

export function Expenses({ hidden }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const query = useQuery({
    queryKey: keys.expenses(filter),
    queryFn: () => listExpenses({ filter, per_page: 50 }),
  });
  const canCreate = canUser(session?.user, 'create_expense');

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

  const columns = useMemo(
    () => [
      { key: 'date', label: 'التاريخ', value: (row) => row.date || '—' },
      { key: 'notes', label: 'البيان', value: (row) => row.public_notes || row.private_notes || '—' },
      { key: 'amount', label: 'المبلغ', value: (row) => money(row.amount || 0, hidden) },
    ],
    [hidden],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث في المصاريف"
        canCreate={canCreate}
        createLabel="مصروف جديد"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={query.data?.data || []}
        columns={columns}
        emptyTitle="لا مصاريف"
        emptyBody="المصروف يُسجل في قاعدة بيانات المكتب بعد تأكيد الخادم فقط."
      />
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
    </>
  );
}
