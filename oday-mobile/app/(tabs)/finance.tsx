import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchOverview } from '@/lib/api/dashboard';
import { keys } from '@/lib/query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, currencyFromId, money } from '@/theme';
import { Card, ErrorState, Kpi, LoadingBlock, OfflineBanner, SectionTitle } from '@/components/ui/Blocks';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';

const LINKS = [
  { href: '/finance/invoices', label: 'الفواتير' },
  { href: '/finance/payments', label: 'الدفعات' },
  { href: '/finance/expenses', label: 'المصاريف' },
  { href: '/finance/cheques', label: 'الشيكات' },
] as const;

export default function FinanceScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const offline = useOffline();
  const [kind, setKind] = useState<QuickKind>(null);
  const overview = useQuery({ queryKey: keys.overview, queryFn: fetchOverview });
  const symbol = currencyFromId(session?.company.currency_id).symbol;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner visible={offline} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} />}>
        <Text style={styles.title}>المالية</Text>
        {overview.isLoading ? <LoadingBlock /> : null}
        {overview.isError ? <ErrorState onRetry={() => overview.refetch()} /> : null}
        {overview.data ? (
          <View style={styles.kpis}>
            <Kpi label="المستحقات" value={money(overview.data.kpis.receivables, symbol)} />
            <Kpi label="دفعات قادمة" value={money(overview.data.kpis.upcoming_payments_total, symbol)} />
          </View>
        ) : null}
        <View style={styles.actions}>
          {[
            ['+ إضافة دفعة', 'payment'],
            ['+ إضافة مصروف', 'expense'],
            ['+ إضافة شيك', 'cheque'],
            ['+ إنشاء فاتورة', 'invoice'],
          ].map(([label, key]) => (
            <Pressable key={key} style={styles.chip} onPress={() => setKind(key as QuickKind)}>
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <SectionTitle title="السجلات" subtitle="عرض سريع بدل الجداول الكثيفة" />
          {LINKS.map((link) => (
            <Pressable key={link.href} onPress={() => router.push(link.href)} style={styles.row}>
              <Text style={styles.rowText}>{link.label}</Text>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, textAlign: 'right' },
  kpis: { flexDirection: 'row-reverse', gap: 10 },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.sidebar, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  chipText: { color: C.white, fontFamily: FONT_BODY },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowText: { fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, textAlign: 'right' },
});
