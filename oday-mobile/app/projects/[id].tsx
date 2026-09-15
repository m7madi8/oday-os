import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getProject } from '@/lib/api/projects';
import { addNote } from '@/lib/api/documents';
import { keys } from '@/lib/query';
import { invoiceStatusLabel, projectFinance } from '@/lib/api/client';
import { C, FONT_BODY, FONT_HEAD, currencyFromId, money } from '@/theme';
import { Card, ErrorState, Kpi, LoadingBlock, Row, SectionTitle } from '@/components/ui/Blocks';
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></Pressable>
        <Text style={styles.barTitle}>المشروع</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}>
        {query.isLoading ? <LoadingBlock /> : null}
        {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
        {project ? (
          <>
            <Text style={styles.title}>{project.name}</Text>
            <Text style={styles.meta}>{project.client?.name || 'بدون عميل'} · {project.number || ''} · {project.due_date || 'بدون تاريخ'}</Text>
            <View style={styles.kpis}>
              <Kpi label="القيمة" value={money(finance.value, symbol)} />
              <Kpi label="المدفوع" value={money(finance.paid, symbol)} />
              <Kpi label="المتبقي" value={money(finance.remaining, symbol)} />
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
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
});
