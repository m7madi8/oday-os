import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listClients } from '@/lib/api/clients';
import { keys } from '@/lib/query';
import { primaryContact } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { LAYOUT, money, currencyFromId } from '@/theme';
import { EmptyState, ErrorState, OfflineBanner, SearchField, Skeleton } from '@/components/ui/Blocks';
import { ResourceCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function ClientsScreen() {
  const router = useRouter();
  const offline = useOffline();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<QuickKind>(null);
  const filter = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: keys.clients(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listClients({ page: pageParam as number, filter, per_page: 20 }),
    getNextPageParam: (last) => {
      const page = last.meta?.pagination?.current_page ?? 1;
      const total = last.meta?.pagination?.total_pages ?? 1;
      return page < total ? page + 1 : undefined;
    },
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ScreenShell title="العملاء">
      <OfflineBanner visible={offline} />
      <View style={styles.head}>
        <SearchField value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الهاتف" />
        <Button label="عميل جديد" onPress={() => setKind('client')} />
      </View>
      {query.isError ? <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        ListEmptyComponent={
          query.isLoading ? (
            <View style={{ gap: 10 }}><Skeleton /><Skeleton /></View>
          ) : (
            <EmptyState title="لا عملاء" body="أضف عميلاً لربط المشاريع والفواتير." />
          )
        }
        renderItem={({ item }) => {
          const contact = primaryContact(item);
          return (
            <ResourceCard
              title={item.name}
              subtitle={`${contact?.phone || item.phone || 'بدون هاتف'} · ${contact?.email || 'بدون بريد'}`}
              meta={[
                { label: 'المستحق', value: money(item.balance, symbol) },
                { label: 'الحالة', value: item.balance > 0 ? 'عليه رصيد' : 'حساب مسدّد' },
              ]}
              onPress={() => router.push(`/clients/${item.id}`)}
            />
          );
        }}
      />
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 8 },
  list: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: LAYOUT.contentPadBottom },
});
