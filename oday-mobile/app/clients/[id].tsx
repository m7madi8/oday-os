import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getClient } from '@/lib/api/clients';
import { listInvoices } from '@/lib/api/invoices';
import { listPayments } from '@/lib/api/payments';
import { listProjects } from '@/lib/api/projects';
import { keys } from '@/lib/query';
import { invoiceStatusLabel, primaryContact } from '@/lib/api/client';
import { C, FONT_BODY, FONT_HEAD, currencyFromId, money } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Card, ErrorState, LoadingBlock, Row, SectionTitle } from '@/components/ui/Blocks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { fetchOfficeSettings } from '@/lib/api/dashboard';

function digits(phone?: string) {
  return (phone || '').replace(/[^\d]/g, '');
}

export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const clientQuery = useQuery({ queryKey: keys.client(id), queryFn: () => getClient(id), enabled: !!id });
  const invoices = useQuery({ queryKey: [...keys.invoices(id), 'client'], queryFn: () => listInvoices({ client_id: id, per_page: 20 }), enabled: !!id });
  const payments = useQuery({ queryKey: [...keys.payments(id), 'client'], queryFn: () => listPayments({ client_id: id, per_page: 20 }), enabled: !!id });
  const projects = useQuery({ queryKey: [...keys.projects(id), 'client'], queryFn: () => listProjects({ filter: '', per_page: 50, include: 'client' }), enabled: !!id });
  const office = useQuery({ queryKey: keys.office, queryFn: fetchOfficeSettings });
  const client = clientQuery.data?.data;
  const contact = primaryContact(client);
  const phone = contact?.phone || client?.phone;
  const relatedProjects = (projects.data?.data ?? []).filter((project) => project.client_id === id);

  const openWhatsApp = (text?: string) => {
    const target = digits(phone) || digits(office.data?.settings.whatsapp);
    if (!target) return;
    const url = `https://wa.me/${target}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></Pressable>
        <Text style={styles.barTitle}>العميل</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={clientQuery.isRefetching} onRefresh={() => clientQuery.refetch()} />}>
        {clientQuery.isLoading ? <LoadingBlock /> : null}
        {clientQuery.isError ? <ErrorState onRetry={() => clientQuery.refetch()} /> : null}
        {client ? (
          <>
            <Text style={styles.title}>{client.name}</Text>
            <Text style={styles.meta}>{phone || 'بدون هاتف'} · {contact?.email || 'بدون بريد'}</Text>
            <Text style={styles.balance}>المستحق {money(client.balance, symbol)}</Text>
            <View style={styles.rowBtns}>
              <Button label="اتصال" disabled={!phone} onPress={() => phone && Linking.openURL(`tel:${phone}`)} />
              <Button label="واتساب" tone="ghost" onPress={() => openWhatsApp(`مرحباً ${client.name}`)} />
            </View>
            <Button
              label="إرسال كشف حساب عبر واتساب"
              tone="ghost"
              onPress={() => openWhatsApp(`كشف حساب ${client.name}\nالمستحق: ${money(client.balance, symbol)}`)}
            />
            <Card>
              <SectionTitle title="المشاريع" />
              {relatedProjects.map((project) => (
                <Row key={project.id} title={project.name} meta={project.due_date} onPress={() => router.push(`/projects/${project.id}`)} />
              ))}
            </Card>
            <Card>
              <SectionTitle title="الفواتير" />
              {(invoices.data?.data ?? []).map((invoice) => (
                <Row key={invoice.id} title={invoice.number || 'فاتورة'} meta={invoiceStatusLabel(invoice.status_id)} amount={money(invoice.balance, symbol)} />
              ))}
            </Card>
            <Card>
              <SectionTitle title="الدفعات" />
              {(payments.data?.data ?? []).map((payment) => (
                <Row key={payment.id} title={payment.number || 'دفعة'} meta={payment.date} amount={money(payment.amount, symbol)} />
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  bar: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  back: { color: C.bronze2, fontFamily: FONT_BODY },
  barTitle: { fontFamily: FONT_HEAD, color: C.ink },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
  balance: { fontFamily: FONT_HEAD, fontSize: 22, color: C.emerald, textAlign: 'right' },
  rowBtns: { flexDirection: 'row-reverse', gap: 10 },
});
