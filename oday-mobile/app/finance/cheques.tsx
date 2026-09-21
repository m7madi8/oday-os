import { useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listCheques, updateCheque } from '@/lib/api/cheques';
import { invalidateFinance, keys } from '@/lib/query';
import { chequeStatusLabel } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { LAYOUT, currencyFromId, money } from '@/theme';
import { EmptyState, ErrorState, SearchField, Skeleton } from '@/components/ui/Blocks';
import { ResourceCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { Cheque } from '@/types/api';

function nextChequeStatus(row: Cheque): Cheque['status'] | null {
  if (row.direction === 'out') {
    if (row.status === 'draft') return 'printed';
    if (row.status === 'printed') return 'delivered';
    if (row.status === 'delivered') return 'cleared';
    return null;
  }
  if (row.status === 'received') return 'deposited';
  if (row.status === 'deposited') return 'processing';
  if (row.status === 'processing') return 'cleared';
  return null;
}

export default function ChequesScreen() {
  const router = useRouter();
  const offline = useOffline();
  const { session } = useAuth();
  const symbol = currencyFromId(session?.company.currency_id).symbol;
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<QuickKind>(null);
  const filter = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: keys.cheques(filter),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listCheques({ page: pageParam as number, filter, per_page: 20 }),
    getNextPageParam: (last) => {
      const page = last.meta?.pagination?.current_page ?? 1;
      const total = last.meta?.pagination?.total_pages ?? 1;
      return page < total ? page + 1 : undefined;
    },
  });
  const advance = useMutation({
    mutationFn: (item: Cheque) => {
      const next = nextChequeStatus(item);
      if (!next) {
        throw new Error('لا يوجد انتقال متاح');
      }
      return updateCheque(item.id, { ...item, status: next });
    },
    onSuccess: () => invalidateFinance(),
    onError: (error) => Alert.alert('تعذر التحديث', error instanceof Error ? error.message : ''),
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <ScreenShell title="الشيكات" onBack={() => router.back()}>
      <View style={styles.head}>
        <SearchField value={search} onChangeText={setSearch} placeholder="بحث برقم الشيك" />
        <Button label="شيك جديد" onPress={() => setKind('cheque')} />
      </View>
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        ListEmptyComponent={query.isLoading ? <Skeleton /> : <EmptyState title="لا شيكات" body="أضف شيكاً واردًا أو صادرًا للمتابعة." />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ResourceCard
              title={`شيك ${item.number}`}
              subtitle={`${item.client_name || item.vendor_name || item.payee_name || item.bank_name} · ${chequeStatusLabel(item.status)}${item.is_overdue ? ' · متأخر' : ''} · ${item.due_date}`}
              meta={[
                { label: 'الاتجاه', value: item.direction === 'in' ? 'وارد' : 'صادر' },
                { label: 'المبلغ', value: money(item.amount, symbol) },
              ]}
            />
            {nextChequeStatus(item) ? (
              <Button
                label={chequeStatusLabel(nextChequeStatus(item)!)}
                disabled={offline || advance.isPending}
                onPress={() =>
                  Alert.alert('تحديث الحالة', 'سيتم إنشاء دفعة محاسبية عند صرف الشيك الوارد.', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تأكيد', onPress: () => advance.mutate(item) },
                  ])
                }
              />
            ) : null}
          </View>
        )}
      />
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 8 },
  list: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 24 },
  item: { gap: 10 },
});

