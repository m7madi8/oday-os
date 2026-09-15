import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchOfficeSettings, fetchOverview } from '@/lib/api/dashboard';
import { keys } from '@/lib/query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, money, currencyFromId } from '@/theme';
import { Card, EmptyState, ErrorState, Kpi, LoadingBlock, OfflineBanner, Row, SectionTitle } from '@/components/ui/Blocks';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { can, displayName } from '@/lib/permissions';

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const offline = useOffline();
  const [kind, setKind] = useState<QuickKind>(null);
  const overview = useQuery({ queryKey: keys.overview, queryFn: fetchOverview });
  const office = useQuery({ queryKey: keys.office, queryFn: fetchOfficeSettings });
  const symbol = currencyFromId(session?.company.currency_id, office.data?.settings.paymentCurrency).symbol;
  const data = overview.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner visible={offline} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} />}
      >
        <View>
          <Text style={styles.kicker}>{office.data?.settings.officeName || session?.company.name || 'ODAY OS'}</Text>
          <Text style={styles.hello}>مرحباً، {displayName(session?.user)}</Text>
          <Text style={styles.sub}>ما يحتاج انتباهاً الآن.</Text>
        </View>

        {overview.isLoading ? <LoadingBlock /> : null}
        {overview.isError ? <ErrorState message={(overview.error as Error).message} onRetry={() => overview.refetch()} /> : null}

        {data ? (
          <>
            <View style={styles.kpis}>
              <Kpi label="إجمالي المستحقات" value={money(data.kpis.receivables, symbol)} />
              <Kpi label="الدفعات القادمة" value={money(data.kpis.upcoming_payments_total, symbol)} hint={`${data.kpis.upcoming_payments_count} فاتورة`} />
              <Kpi label="الشيكات القادمة" value={money(data.kpis.upcoming_cheques_total, symbol)} hint={`${data.kpis.upcoming_cheques_count} شيك`} />
              <Kpi label="المشاريع النشطة" value={String(data.kpis.active_projects)} />
            </View>

            <Card>
              <SectionTitle title="إجراءات سريعة" />
              <View style={styles.actions}>
                {[
                  ['إضافة دفعة', 'payment', 'create_payment'],
                  ['إضافة مصروف', 'expense', 'create_expense'],
                  ['إضافة مشروع', 'project', 'create_project'],
                  ['إضافة عميل', 'client', 'create_client'],
                  ['إنشاء فاتورة', 'invoice', 'create_invoice'],
                ]
                  .filter(([, , perm]) =>
                    can(session?.user.permissions ?? '', session?.user.is_admin ?? false, session?.user.is_owner ?? false, perm),
                  )
                  .map(([label, key]) => (
                  <Pressable key={key} onPress={() => setKind(key as QuickKind)} style={styles.action}>
                    <Text style={styles.actionText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <Card>
              <SectionTitle title="تنبيهات مهمة" />
              {data.alerts.length === 0 ? (
                <EmptyState title="لا تنبيهات" body="الحسابات مستقرة حالياً." />
              ) : (
                data.alerts.map((alert) => (
                  <Row
                    key={alert.id}
                    title={alert.title}
                    meta={alert.body}
                    amount={money(alert.amount, symbol)}
                    onPress={() => {
                      if (alert.entity_type === 'invoice') router.push('/finance/invoices');
                      if (alert.entity_type === 'cheque') router.push('/finance/cheques');
                    }}
                  />
                ))
              )}
            </Card>

            <Card>
              <SectionTitle title="آخر العمليات" />
              {data.activity.length === 0 ? (
                <EmptyState title="لا حركة بعد" body="ستظهر هنا عمليات الفواتير والدفعات." />
              ) : (
                data.activity.map((item) => <Row key={item.id} title={item.label} meta={item.notes} />)
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  kicker: { color: C.bronze2, textAlign: 'right', fontFamily: FONT_BODY },
  hello: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 28, textAlign: 'right', marginTop: 4 },
  sub: { color: C.inkSoft, textAlign: 'right', fontFamily: FONT_BODY, marginTop: 4 },
  kpis: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  action: { backgroundColor: C.tint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { color: C.ink, fontFamily: FONT_BODY },
});
