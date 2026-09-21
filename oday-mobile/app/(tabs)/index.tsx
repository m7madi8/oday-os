import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Banknote, CircleDollarSign, FolderKanban, ScrollText } from 'lucide-react-native';
import { fetchOfficeSettings, fetchOverview } from '@/lib/api/dashboard';
import { keys } from '@/lib/query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, LAYOUT, count, money, currencyFromId } from '@/theme';
import { ActionChip, Card, EmptyState, ErrorState, LoadingBlock, OfflineBanner, Row, SectionTitle } from '@/components/ui/Blocks';
import { FinanceCard, StatCard, Surface } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { timeGreeting } from '@/lib/greeting';
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
    <ScreenShell title="اليوم">
      <OfflineBanner visible={offline} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} />}
      >
        <View style={styles.hero}>
          <Text style={styles.kicker}>{office.data?.settings.officeName || session?.company.name || 'ODAY OS'}</Text>
          <Text style={styles.hello}>
            {timeGreeting()}، {session?.user?.first_name?.trim() || displayName(session?.user).split(/\s+/)[0]}
          </Text>
        </View>

        {overview.isLoading ? <LoadingBlock /> : null}
        {overview.isError ? <ErrorState message={(overview.error as Error).message} onRetry={() => overview.refetch()} /> : null}

        {data ? (
          <>
            <View style={styles.statGrid}>
              <StatCard icon={CircleDollarSign} label="لم يُدفع بعد" value={money(data.kpis.receivables, symbol)} onPress={() => router.push('/finance/invoices')} />
              <StatCard icon={ScrollText} label="شيكات قريبة" value={count(data.kpis.upcoming_cheques_count)} onPress={() => router.push('/finance/cheques')} />
              <StatCard icon={FolderKanban} label="مشاريع نشطة" value={count(data.kpis.active_projects)} onPress={() => router.push('/(tabs)/projects')} />
              <StatCard icon={Banknote} label="تحصيل قادم" value={count(data.kpis.upcoming_payments_count)} onPress={() => router.push('/finance/payments')} />
            </View>

            <View style={styles.financeRow}>
              <FinanceCard featured kind="net" label="صافي المستحقات" value={money(data.kpis.receivables, symbol)} />
              <FinanceCard kind="expense" label="شيكات قادمة" value={money(data.kpis.upcoming_cheques_total, symbol)} />
              <FinanceCard kind="income" label="دفعات قادمة" value={money(data.kpis.upcoming_payments_total, symbol)} />
            </View>

            <Surface>
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
                    <ActionChip key={key} label={label} onPress={() => setKind(key as QuickKind)} />
                  ))}
              </View>
            </Surface>

            <Card>
              <SectionTitle title="تنبيهات وتحصيلات" />
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: LAYOUT.contentPadX,
    gap: LAYOUT.sectionGap,
    paddingBottom: LAYOUT.contentPadBottom,
  },
  hero: { gap: 4, marginBottom: 4 },
  kicker: { color: C.limeDeep, textAlign: 'right', fontFamily: FONT_BODY, fontSize: 13 },
  hello: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, textAlign: 'right' },
  statGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: LAYOUT.cardGap },
  financeRow: { gap: LAYOUT.cardGap },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
});
