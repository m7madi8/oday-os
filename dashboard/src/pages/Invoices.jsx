import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { createInvoice, downloadInvoicePdf, listInvoices } from '../lib/api/invoices';
import { listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { C } from '../theme';
import { canUser } from '../lib/permissions';
import { invoiceStatusLabel, todayIso } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect, ResourcePage } from '../components/ui/ResourcePage';
import { GhostButton, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { openOrSaveBlob } from '../lib/files';

export function Invoices({ hidden }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('أتعاب هندسية');

  const query = useQuery({
    queryKey: keys.invoices(filter),
    queryFn: () => listInvoices({ filter, per_page: 50 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
  const rows = query.data?.data || [];
  const canCreate = canUser(session?.user, 'create_invoice');

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

  const columns = useMemo(
    () => [
      { key: 'number', label: 'الرقم', value: (row) => row.number || '—' },
      { key: 'client', label: 'العميل', value: (row) => row.client?.name || '—' },
      { key: 'amount', label: 'المبلغ', value: (row) => money(row.amount || 0, hidden) },
      { key: 'balance', label: 'المتبقي', value: (row) => money(row.balance || 0, hidden) },
      { key: 'status', label: 'الحالة', value: (row) => invoiceStatusLabel(row.status_id) },
      {
        key: 'pdf',
        label: '',
        render: (row) => (
          <GhostButton onClick={(event) => { event.stopPropagation(); printRow(row); }}>
            <Printer size={14} />
            PDF
          </GhostButton>
        ),
      },
    ],
    [hidden],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث في الفواتير"
        canCreate={canCreate}
        createLabel="فاتورة جديدة"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={rows}
        columns={columns}
        emptyTitle="لا فواتير"
        emptyBody="الفواتير تُنشأ على الخادم وتظهر فوراً في كل واجهات ODAY OS."
      />
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
    </>
  );
}
