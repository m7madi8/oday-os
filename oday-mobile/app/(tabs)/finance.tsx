import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { fetchOverview } from '@/lib/api/dashboard';
import { keys } from '@/lib/query';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOffline } from '@/hooks/useOffline';
import { C, FONT_HEAD, LAYOUT, currencyFromId, money } from '@/theme';
import { ActionChip, Card, ErrorState, LoadingBlock, OfflineBanner, SectionTitle } from '@/components/ui/Blocks';
import { StatCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { CircleDollarSign, ScrollText } from 'lucide-react-native';

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
    <ScreenShell title="المالية">
      <OfflineBanner visible={offline} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={overview.isRefetching} onRefresh={() => overview.refetch()} />}
      >
        {overview.isLoading ? <LoadingBlock /> : null}
        {overview.isError ? <ErrorState onRetry={() => overview.refetch()} /> : null}
        {overview.data ? (
          <View style={styles.statGrid}>
            <StatCard icon={CircleDollarSign} label="المستحقات" value={money(overview.data.kpis.receivables, symbol)} />
            <StatCard icon={ScrollText} label="دفعات قادمة" value={money(overview.data.kpis.upcoming_payments_total, symbol)} />
          </View>
        ) : null}
        <View style={styles.actions}>
          {[
            ['+ إضافة دفعة', 'payment'],
            ['+ إضافة مصروف', 'expense'],
            ['+ إضافة شيك', 'cheque'],
            ['+ إنشاء فاتورة', 'invoice'],
          ].map(([label, key]) => (
            <ActionChip key={key} label={label} onPress={() => setKind(key as QuickKind)} />
          ))}
        </View>
        <Card>
          <SectionTitle title="السجلات" />
          {LINKS.map((link) => (
            <Pressable key={link.href} onPress={() => router.push(link.href)} style={styles.row}>
              <Text style={styles.rowText}>{link.label}</Text>
            </Pressable>
          ))}
        </Card>
      </ScrollView>
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: LAYOUT.contentPadX, gap: LAYOUT.sectionGap, paddingBottom: LAYOUT.contentPadBottom },
  statGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: LAYOUT.cardGap },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowText: { fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, textAlign: 'right' },
});
