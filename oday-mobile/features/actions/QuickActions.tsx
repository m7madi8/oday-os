import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sheet } from '@/components/ui/Sheet';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { createClient, listClients } from '@/lib/api/clients';
import { createProject } from '@/lib/api/projects';
import { createInvoice } from '@/lib/api/invoices';
import { createPayment } from '@/lib/api/payments';
import { createExpense } from '@/lib/api/expenses';
import { createCheque } from '@/lib/api/cheques';
import { invalidateFinance, keys } from '@/lib/query';
import { ApiError } from '@/lib/api/client';
import { useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY } from '@/theme';

export type QuickKind = 'client' | 'project' | 'invoice' | 'payment' | 'expense' | 'cheque' | null;

export function QuickActions({ kind, onClose }: { kind: QuickKind; onClose: () => void }) {
  const offline = useOffline();
  const titles: Record<Exclude<QuickKind, null>, string> = {
    client: 'إضافة عميل',
    project: 'إضافة مشروع',
    invoice: 'إنشاء فاتورة',
    payment: 'إضافة دفعة',
    expense: 'إضافة مصروف',
    cheque: 'إضافة شيك',
  };

  return (
    <Sheet visible={!!kind} title={kind ? titles[kind] : ''} onClose={onClose}>
      {offline ? <Button label="لا يمكن الحفظ بدون اتصال" tone="ghost" disabled /> : null}
      {kind === 'client' ? <ClientForm disabled={offline} onDone={onClose} /> : null}
      {kind === 'project' ? <ProjectForm disabled={offline} onDone={onClose} /> : null}
      {kind === 'invoice' ? <InvoiceForm disabled={offline} onDone={onClose} /> : null}
      {kind === 'payment' ? <PaymentForm disabled={offline} onDone={onClose} /> : null}
      {kind === 'expense' ? <ExpenseForm disabled={offline} onDone={onClose} /> : null}
      {kind === 'cheque' ? <ChequeForm disabled={offline} onDone={onClose} /> : null}
    </Sheet>
  );
}

function useClients() {
  return useQuery({ queryKey: keys.clients(), queryFn: () => listClients({ per_page: 50 }) });
}

function fail(error: unknown) {
  const message = error instanceof ApiError ? error.message : 'تعذر الحفظ';
  Alert.alert('لم يتم الحفظ', message);
}

function ClientPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const clients = useClients();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.inkSoft, fontFamily: FONT_BODY, textAlign: 'right' }}>العميل</Text>
      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
        {(clients.data?.data ?? []).slice(0, 12).map((client) => {
          const active = value === client.id;
          return (
            <Pressable
              key={client.id}
              onPress={() => onChange(client.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? C.sidebar : C.tint,
              }}
            >
              <Text style={{ color: active ? C.white : C.ink, fontFamily: FONT_BODY }}>{client.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ClientForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      createClient({
        name,
        contacts: [{ first_name: name, email, phone, send_email: false }],
      }),
    onSuccess: async () => {
      await invalidateFinance();
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <Field label="اسم العميل" value={name} onChangeText={setName} />
      <Field label="الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="البريد" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button label="حفظ العميل" disabled={disabled || !name} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}

function ClientModeToggle({ mode, onChange }: { mode: 'new' | 'existing'; onChange: (mode: 'new' | 'existing') => void }) {
  return (
    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
      {([
        ['new', 'عميل جديد'],
        ['existing', 'عميل موجود'],
      ] as const).map(([value, label]) => {
        const active = mode === value;
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: active ? C.sidebar : C.tint,
            }}
          >
            <Text style={{ color: active ? C.white : C.ink, fontFamily: FONT_BODY }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProjectForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const clients = useClients();
  const [name, setName] = useState('');
  const [clientMode, setClientMode] = useState<'new' | 'existing'>('new');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const selected = clientId || clients.data?.data?.[0]?.id || '';
  const canSave =
    !!name &&
    (clientMode === 'new' ? !!clientName.trim() : !!selected);
  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedClientId = selected;
      if (clientMode === 'new') {
        const created = await createClient({
          name: clientName.trim(),
          contacts: [
            {
              first_name: clientName.trim(),
              email: clientEmail.trim(),
              phone: clientPhone.trim(),
              send_email: false,
            },
          ],
        });
        resolvedClientId = created.data.id;
      }
      if (!resolvedClientId) {
        throw new ApiError('اختر العميل أو أدخل بيانات عميل جديد', 422);
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
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <Field label="اسم المشروع" value={name} onChangeText={setName} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: C.inkSoft, fontFamily: FONT_BODY, textAlign: 'right' }}>العميل</Text>
        <ClientModeToggle mode={clientMode} onChange={setClientMode} />
      </View>
      {clientMode === 'new' ? (
        <>
          <Field label="اسم العميل" value={clientName} onChangeText={setClientName} />
          <Field label="هاتف العميل" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" />
          <Field label="بريد العميل" value={clientEmail} onChangeText={setClientEmail} keyboardType="email-address" autoCapitalize="none" />
        </>
      ) : (
        <ClientPicker value={selected} onChange={setClientId} />
      )}
      <Field label="قيمة المشروع" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="تاريخ الاستحقاق YYYY-MM-DD" value={due} onChangeText={setDue} />
      <Button label="حفظ المشروع والعميل" disabled={disabled || !canSave} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}

function InvoiceForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const clients = useClients();
  const [clientId, setClientId] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('أتعاب هندسية');
  const selected = clientId || clients.data?.data?.[0]?.id || '';
  const mutation = useMutation({
    mutationFn: () =>
      createInvoice({
        client_id: selected,
        date: new Date().toISOString().slice(0, 10),
        line_items: [{ quantity: 1, cost: Number(cost) || 0, notes, product_key: notes }],
      }),
    onSuccess: async () => {
      await invalidateFinance();
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <ClientPicker value={selected} onChange={setClientId} />
      <Field label="المبلغ" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
      <Field label="البيان" value={notes} onChangeText={setNotes} />
      <Button label="إنشاء الفاتورة" disabled={disabled || !selected || !cost} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}

function PaymentForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const clients = useClients();
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const selected = clientId || clients.data?.data?.[0]?.id || '';
  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        client_id: selected,
        amount: Number(amount) || 0,
        date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: async () => {
      await invalidateFinance();
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <ClientPicker value={selected} onChange={setClientId} />
      <Field label="مبلغ الدفعة" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Button label="حفظ الدفعة" disabled={disabled || !selected || !amount} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}

function ExpenseForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      createExpense({
        amount: Number(amount) || 0,
        date: new Date().toISOString().slice(0, 10),
        public_notes: notes,
      }),
    onSuccess: async () => {
      await invalidateFinance();
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <Field label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="البيان" value={notes} onChangeText={setNotes} />
      <Button label="حفظ المصروف" disabled={disabled || !amount} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}

function ChequeForm({ disabled, onDone }: { disabled: boolean; onDone: () => void }) {
  const [number, setNumber] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [clientId, setClientId] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      createCheque({
        direction: 'in',
        number,
        bank_name: bank,
        amount: String(amount).trim(),
        currency_code: 'ILS',
        due_date: due || undefined,
        client_id: clientId || undefined,
      }),
    onSuccess: async () => {
      await invalidateFinance();
      onDone();
    },
    onError: fail,
  });
  return (
    <>
      <Field label="رقم الشيك" value={number} onChangeText={setNumber} />
      <Field label="البنك" value={bank} onChangeText={setBank} />
      <Field label="المبلغ" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="تاريخ الاستحقاق YYYY-MM-DD" value={due} onChangeText={setDue} />
      <ClientPicker value={clientId} onChange={setClientId} />
      <Button label="حفظ الشيك" disabled={disabled || !number || !amount} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </>
  );
}
