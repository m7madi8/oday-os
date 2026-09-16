import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listProjects } from '@/lib/api/projects';
import { keys } from '@/lib/query';
import { projectFinance } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { LAYOUT, money, currencyFromId } from '@/theme';
import { EmptyState, ErrorState, OfflineBanner, SearchField, Skeleton } from '@/components/ui/Blocks';
import { ResourceCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function ProjectsScreen() {
  const router = useRouter();
  const offline = useOffline();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<QuickKind>(null);
  const filter = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: keys.projects(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listProjects({ page: pageParam as number, filter, include: 'client,invoices', per_page: 20 }),
    getNextPageParam: (last) => {
      const page = last.meta?.pagination?.current_page ?? 1;
      const total = last.meta?.pagination?.total_pages ?? 1;
      return page < total ? page + 1 : undefined;
    },
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ScreenShell title="المشاريع">
      <OfflineBanner visible={offline} />
      <View style={styles.head}>
        <SearchField value={search} onChangeText={setSearch} placeholder="بحث" />
        <Button label="مشروع جديد" onPress={() => setKind('project')} />
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
            <View style={{ gap: 10 }}><Skeleton /><Skeleton /><Skeleton /></View>
          ) : (
            <EmptyState title="لا مشاريع" body="أضف أول مشروع من المكتب أو من هنا." />
          )
        }
        renderItem={({ item }) => {
          const finance = projectFinance(item);
          return (
            <ResourceCard
              title={item.name}
              subtitle={`${item.client?.name || 'بدون عميل'} · ${item.due_date || 'بدون تاريخ'}`}
              meta={[
                { label: 'القيمة', value: money(finance.value, symbol) },
                { label: 'المتبقي', value: money(finance.remaining, symbol) },
              ]}
              onPress={() => router.push(`/projects/${item.id}`)}
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
