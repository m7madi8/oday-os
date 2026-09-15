import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { listInvoices } from '@/lib/api/invoices';
import { keys } from '@/lib/query';
import { invoiceStatusLabel } from '@/lib/api/client';
import { useDebounced } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, TAP, currencyFromId, money } from '@/theme';
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui/Blocks';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function InvoicesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [search, setSearch] = useState('');
  const filter = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: keys.invoices(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listInvoices({ page: pageParam as number, filter, per_page: 20 }),
    getNextPageParam: (last) => {
      const page = last.meta?.pagination?.current_page ?? 1;
      const total = last.meta?.pagination?.total_pages ?? 1;
      return page < total ? page + 1 : undefined;
    },
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></Pressable>
        <Text style={styles.title}>الفواتير</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="بحث" placeholderTextColor={C.inkFaint} style={styles.search} textAlign="right" />
      </View>
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        ListEmptyComponent={query.isLoading ? <Skeleton /> : <EmptyState title="لا فواتير" body="أنشئ فاتورة من المالية." />}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>{item.number || 'فاتورة'}</Text>
            <Text style={styles.meta}>{item.client?.name || ''} · {invoiceStatusLabel(item.status_id)} · {item.due_date}</Text>
            <Text style={styles.meta}>المبلغ {money(item.amount, symbol)} · المتبقي {money(item.balance, symbol)}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  head: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  back: { color: C.bronze2, fontFamily: FONT_BODY, textAlign: 'right' },
  title: { fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, textAlign: 'right' },
  search: { minHeight: TAP, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 14, color: C.ink, fontFamily: FONT_BODY },
  name: { fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
});
