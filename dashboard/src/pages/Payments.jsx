import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createPayment, listPayments } from '../lib/api/payments';
import { listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { C } from '../theme';
import { canUser } from '../lib/permissions';
import { todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect, ResourcePage } from '../components/ui/ResourcePage';
import { PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';

export function Payments({ hidden }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');

  const query = useQuery({
    queryKey: keys.payments(filter),
    queryFn: () => listPayments({ filter, per_page: 50 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
  const canCreate = canUser(session?.user, 'create_payment');

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        client_id: clientId,
        amount: Number(amount) || 0,
        date: todayIso(),
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setAmount('');
      showToast('تم تسجيل الدفعة على الخادم', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const columns = useMemo(
    () => [
      { key: 'number', label: 'الرقم', value: (row) => row.number || '—' },
      { key: 'client', label: 'العميل', value: (row) => row.client?.name || '—' },
      { key: 'amount', label: 'المبلغ', value: (row) => money(row.amount || 0, hidden) },
      { key: 'date', label: 'التاريخ', value: (row) => row.date || '—' },
    ],
    [hidden],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث في الدفعات"
        canCreate={canCreate}
        createLabel="دفعة جديدة"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={query.data?.data || []}
        columns={columns}
        emptyTitle="لا دفعات"
        emptyBody="لن تُعتبر الدفعة مكتملة إلا بعد تأكيد الخادم."
      />
      <Sheet open={open} title="إضافة دفعة" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>العميل</span>
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المبلغ</span>
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
        </label>
        <PrimaryButton disabled={!clientId || !amount || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          حفظ الدفعة
        </PrimaryButton>
      </Sheet>
    </>
  );
}
