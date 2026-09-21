import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createProject, listProjects } from '../lib/api/projects';
import { createClient, listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { canUser } from '../lib/permissions';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ClientSelect, ResourcePage } from '../components/ui/ResourcePage';
import { GhostButton, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { todayIso } from '../lib/labels';
import { C } from '../theme';

export function Projects({ hidden, onOpenProject }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientMode, setClientMode] = useState('new');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');

  const query = useQuery({
    queryKey: keys.projects(filter),
    queryFn: () => listProjects({ filter, per_page: 50 }),
  });
  const clients = useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
  const rows = query.data?.data || [];
  const canCreate = canUser(session?.user, 'create_project');

  const canSave = name && (clientMode === 'new' ? clientName.trim() : clientId);

  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedClientId = clientId;
      if (clientMode === 'new') {
        const created = await createClient({
          name: clientName.trim(),
          contacts: [{ first_name: clientName.trim(), email: clientEmail.trim(), phone: clientPhone.trim(), send_email: false }],
        });
        resolvedClientId = created.data.id;
      }
      if (!resolvedClientId) {
        throw new Error('اختر العميل أو أدخل بيانات عميل جديد');
      }
      return createProject({
        name,
        client_id: resolvedClientId,
        budgeted_amount: Number(amount) || 0,
        due_date: due || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setName('');
      setClientMode('new');
      setClientId('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setAmount('');
      setDue('');
      showToast(clientMode === 'new' ? 'تم حفظ المشروع والعميل' : 'تم حفظ المشروع', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const columns = useMemo(
    () => [
      { key: 'name', label: 'المشروع', value: (row) => row.name },
      { key: 'client', label: 'العميل', value: (row) => row.client?.name || '—' },
      { key: 'budget', label: 'القيمة', value: (row) => money(row.budgeted_amount || 0, hidden) },
      { key: 'due', label: 'الاستحقاق', value: (row) => row.due_date || '—' },
    ],
    [hidden],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث باسم المشروع"
        canCreate={canCreate}
        createLabel="مشروع جديد"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={rows}
        columns={columns}
        emptyTitle="لا مشاريع بعد"
        emptyBody="أنشئ مشروعاً هنا ليظهر فوراً في الويب والجوال من نفس قاعدة البيانات."
        onRowClick={onOpenProject ? (row) => onOpenProject(row.id) : undefined}
      />
      <Sheet open={open} title="إضافة مشروع" onClose={() => setOpen(false)}>
        <Field label="اسم المشروع">
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="العميل">
          <div className="flex flex-wrap gap-2 mb-2">
            <GhostButton type="button" onClick={() => setClientMode('new')} className={clientMode === 'new' ? 'opacity-100' : 'opacity-60'}>
              عميل جديد
            </GhostButton>
            <GhostButton type="button" onClick={() => setClientMode('existing')} className={clientMode === 'existing' ? 'opacity-100' : 'opacity-60'}>
              عميل موجود
            </GhostButton>
          </div>
          {clientMode === 'new' ? (
            <div className="space-y-3">
              <TextInput value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="اسم العميل" />
              <TextInput value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="هاتف العميل" />
              <TextInput value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="بريد العميل" />
            </div>
          ) : (
            <ClientSelect clients={clients.data?.data} value={clientId} onChange={setClientId} />
          )}
        </Field>
        <Field label="قيمة المشروع">
          <TextInput value={amount} onChange={(event) => setAmount(event.target.value)} className="tabular-nums" />
        </Field>
        <Field label="تاريخ الاستحقاق">
          <TextInput type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>
        <PrimaryButton disabled={!canSave || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {clientMode === 'new' ? 'حفظ المشروع والعميل' : 'حفظ المشروع'}
        </PrimaryButton>
        <p className="text-base" style={{ color: C.inkFaint }}>التاريخ الافتراضي إن لم يُحدد: {todayIso()}</p>
      </Sheet>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}
