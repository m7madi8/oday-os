import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CircleDollarSign, Wallet } from 'lucide-react-native';
import { getProject } from '@/lib/api/projects';
import { addNote } from '@/lib/api/documents';
import { keys } from '@/lib/query';
import { invoiceStatusLabel, projectFinance } from '@/lib/api/client';
import { C, FONT_BODY, FONT_HEAD, LAYOUT, currencyFromId, money } from '@/theme';
import { Card, ErrorState, LoadingBlock, Row, SectionTitle } from '@/components/ui/Blocks';
import { StatCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth/AuthProvider';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [kind, setKind] = useState<QuickKind>(null);
  const [note, setNote] = useState('');
  const query = useQuery({
    queryKey: keys.project(id),
    queryFn: () => getProject(id),
    enabled: !!id,
  });
  const project = query.data?.data;
  const finance = project ? projectFinance(project) : { value: 0, paid: 0, remaining: 0 };

  return (
    <ScreenShell title="المشروع" onBack={() => router.back()}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}>
        {query.isLoading ? <LoadingBlock /> : null}
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
        {project ? (
          <>
            <Text style={styles.title}>{project.name}</Text>
            <Text style={styles.meta}>{project.client?.name || 'بدون عميل'} · {project.number || ''} · {project.due_date || 'بدون تاريخ'}</Text>
            <View style={styles.kpis}>
              <StatCard icon={CircleDollarSign} label="القيمة" value={money(finance.value, symbol)} />
              <StatCard icon={Wallet} label="المدفوع" value={money(finance.paid, symbol)} />
              <StatCard icon={CircleDollarSign} label="المتبقي" value={money(finance.remaining, symbol)} />
            </View>
            <Card>
              <SectionTitle title="ملاحظات" subtitle={project.private_notes || project.public_notes || 'لا ملاحظات'} />
              <Field label="ملاحظة جديدة" value={note} onChangeText={setNote} />
              <Button
                label="حفظ ملاحظة"
                disabled={!note}
                onPress={async () => {
                  try {
                    await addNote({ entity: 'project', entity_id: project.id, notes: note });
                    setNote('');
                    query.refetch();
                  } catch (error) {
                    Alert.alert('تعذر الحفظ', error instanceof Error ? error.message : '');
                  }
                }}
              />
            </Card>
            <Card>
              <SectionTitle title="الفواتير" />
              {(project.invoices ?? []).map((invoice) => (
                <Row key={invoice.id} title={invoice.number || 'فاتورة'} meta={invoiceStatusLabel(invoice.status_id)} amount={money(invoice.balance, symbol)} />
              ))}
            </Card>
            <Card>
              <SectionTitle title="المستندات" />
              {(project.documents ?? []).length === 0 ? <Text style={styles.meta}>لا مرفقات</Text> : null}
              {(project.documents ?? []).map((doc) => (
                <Row key={doc.id} title={doc.name || 'مستند'} meta={doc.type} />
              ))}
            </Card>
            <Button label="إضافة دفعة" onPress={() => setKind('payment')} />
            <Button label="إنشاء فاتورة" tone="ghost" onPress={() => setKind('invoice')} />
          </>
        ) : null}
      </ScrollView>
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: LAYOUT.contentPadX, gap: 14, paddingBottom: 24 },
  title: { fontFamily: FONT_HEAD, fontSize: 22, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
});
