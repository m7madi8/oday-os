import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Mail, Phone } from 'lucide-react';
import { createClient, listClients } from '../lib/api/clients';
import { invalidateFinance, keys } from '../lib/query';
import { money } from '../theme';
import { C } from '../theme';
import { canUser } from '../lib/permissions';
import { primaryContact } from '../lib/labels';
import { useAuth } from '../lib/auth/AuthProvider';
import { Sheet } from '../components/ui/Sheet';
import { ResourcePage } from '../components/ui/ResourcePage';
import { GhostButton, PrimaryButton } from '../components/ui/Actions';
import { TextInput } from '../components/settings/Fields';
import { showToast } from '../lib/toast';
import { openEmail, openWhatsApp } from '../lib/files';

export function Clients({ hidden }) {
  const { session } = useAuth();
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const query = useQuery({
    queryKey: keys.clients(filter),
    queryFn: () => listClients({ filter, per_page: 50 }),
  });
  const rows = query.data?.data || [];
  const canCreate = canUser(session?.user, 'create_client');

  const mutation = useMutation({
    mutationFn: () =>
      createClient({
        name,
        contacts: [{ first_name: name, email, phone, send_email: false }],
      }),
    onSuccess: async () => {
      await invalidateFinance();
      setOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      showToast('تم حفظ العميل', 'ok');
    },
    onError: (error) => showToast(error.message, 'error'),
  });

  const columns = useMemo(
    () => [
      { key: 'name', label: 'العميل', value: (row) => row.name },
      { key: 'phone', label: 'الهاتف', value: (row) => primaryContact(row)?.phone || row.phone || '—' },
      { key: 'balance', label: 'الرصيد', value: (row) => money(row.balance || 0, hidden) },
      {
        key: 'actions',
        label: '',
        render: (row) => {
          const contact = primaryContact(row);
          return (
            <div className="flex gap-2 justify-end">
              {contact?.phone ? (
                <GhostButton onClick={(event) => { event.stopPropagation(); openWhatsApp(contact.phone); }}>
                  <Phone size={14} />
                </GhostButton>
              ) : null}
              {contact?.email ? (
                <GhostButton onClick={(event) => { event.stopPropagation(); openEmail(contact.email); }}>
                  <Mail size={14} />
                </GhostButton>
              ) : null}
            </div>
          );
        },
      },
    ],
    [hidden],
  );

  return (
    <>
      <ResourcePage
        search={filter}
        onSearch={setFilter}
        searchPlaceholder="ابحث باسم العميل"
        canCreate={canCreate}
        createLabel="عميل جديد"
        onCreate={() => setOpen(true)}
        loading={query.isLoading}
        error={query.isError ? query.error?.message : ''}
        onRetry={() => query.refetch()}
        rows={rows}
        columns={columns}
        emptyTitle="لا عملاء بعد"
        emptyBody="أضف عميلاً ليظهر في الويب وسطح المكتب والجوال من نفس السجل."
      />
      <Sheet open={open} title="إضافة عميل" onClose={() => setOpen(false)}>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>اسم العميل</span>
          <TextInput value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>الهاتف</span>
          <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="block">
          <span className="block text-base mb-1.5" style={{ color: C.inkSoft }}>البريد</span>
          <TextInput value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <PrimaryButton disabled={!name || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          حفظ العميل
        </PrimaryButton>
      </Sheet>
    </>
  );
}
