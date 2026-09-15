import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createCheque, listCheques, updateCheque } from '../lib/api/cheques';
import { listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { C } from '../theme';
import { canUser } from '../lib/permissions';
import { chequeDirectionLabel, chequeStatusLabel } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect, ResourcePage } from '../components/ui/ResourcePage';
import { GhostButton, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';

export function Cheques({ hidden }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [clientId, setClientId] = useState('');
  const [direction, setDirection] = useState('in');

  const query = useQuery({
    queryKey: keys.cheques(filter),
    queryFn: () => listCheques({ filter, per_page: 50 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
  const canCreate = canUser(session?.user, 'create_payment');

  const mutation = useMutation({
    mutationFn: () =>
      createCheque({
        direction,
        number,
        bank_name: bank,
        amount: Number(amount) || 0,
        due_date: due || undefined,
        client_id: clientId || undefined,
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setNumber('');
      setAmount('');
      showToast('تم حفظ الشيك', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const clearMutation = useMutation({
    mutationFn: (row) =>
      updateCheque(row.id, {
        direction: row.direction,
        number: row.number,
        bank_name: row.bank_name,
        amount: row.amount,
        due_date: row.due_date || null,
        status: 'cleared',
        notes: row.notes,
        client_id: row.client_id || null,
        invoice_id: row.invoice_id || null,
      }),
    onSuccess: async () => {
      await invalidateFinance();
      showToast('تم قبض الشيك', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const columns = useMemo(
    () => [
      { key: 'number', label: 'الرقم', value: (row) => row.number },
      { key: 'dir', label: 'الاتجاه', value: (row) => chequeDirectionLabel(row.direction) },
      { key: 'client', label: 'العميل', value: (row) => row.client_name || '—' },
      { key: 'amount', label: 'المبلغ', value: (row) => money(row.amount || 0, hidden) },
      { key: 'due', label: 'الاستحقاق', value: (row) => row.due_date || '—' },
      { key: 'status', label: 'الحالة', value: (row) => chequeStatusLabel(row.status) },
      {
        key: 'act',
        label: '',
        render: (row) =>
          row.status !== 'cleared' && canCreate ? (
            <GhostButton onClick={(event) => { event.stopPropagation(); clearMutation.mutate(row); }}>
              قبض
            </GhostButton>
          ) : null,
      },
    ],
    [hidden, canCreate, clearMutation],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث برقم الشيك أو البنك"
        canCreate={canCreate}
        createLabel="شيك جديد"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={query.data?.data || []}
        columns={columns}
        emptyTitle="لا شيكات"
        emptyBody="سجل الشيكات مرتبط بقاعدة بيانات المكتب وليس بهذا الجهاز."
      />
      <Sheet open={open} title="إضافة شيك" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الاتجاه</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value)} className="w-full rounded-xl px-3 py-2.5 min-h-11" style={{ background: C.paper, border: `1px solid ${C.border}` }}>
            <option value="in">وارد</option>
            <option value="out">صادر</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>رقم الشيك</span>
          <TextInput value={number} onChange={(event) => setNumber(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>البنك</span>
          <TextInput value={bank} onChange={(event) => setBank(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>المبلغ</span>
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>تاريخ الاستحقاق</span>
          <TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>العميل</span>
          <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
        </label>
        <PrimaryButton disabled={!number || !amount || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          حفظ الشيك
        </PrimaryButton>
      </Sheet>
    </>
  );
}
