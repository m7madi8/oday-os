import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listExpenses } from '@/lib/api/expenses';
import { keys } from '@/lib/query';
import { useDebounced } from '@/hooks/useOffline';
import { LAYOUT, currencyFromId, money } from '@/theme';
import { EmptyState, ErrorState, SearchField, Skeleton } from '@/components/ui/Blocks';
import { ResourceCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function ExpensesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [search, setSearch] = useState('');
  const filter = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: keys.expenses(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listExpenses({ page: pageParam as number, filter, per_page: 20 }),
    getNextPageParam: (last) => {
      const page = last.meta?.pagination?.current_page ?? 1;
      const total = last.meta?.pagination?.total_pages ?? 1;
      return page < total ? page + 1 : undefined;
    },
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ScreenShell title="المصاريف" onBack={() => router.back()}>
      <View style={styles.head}>
        <SearchField value={search} onChangeText={setSearch} placeholder="بحث" />
      </View>
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        ListEmptyComponent={query.isLoading ? <Skeleton /> : <EmptyState title="لا مصاريف" body="أضف مصروفاً من المالية." />}
        renderItem={({ item }) => (
          <ResourceCard
            title={item.public_notes || 'مصروف'}
            subtitle={item.date}
            meta={[{ label: 'المبلغ', value: money(item.amount, symbol) }]}
          />
        )}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: LAYOUT.contentPadX, paddingBottom: 8 },
  list: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 24 },
});
