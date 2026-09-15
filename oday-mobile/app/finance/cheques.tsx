import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listCheques, updateCheque } from '@/lib/api/cheques';
import { invalidateFinance, keys } from '@/lib/query';
import { chequeStatusLabel } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, TAP, currencyFromId, money } from '@/theme';
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui/Blocks';
import { Button } from '@/components/ui/Button';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { useAuth } from '@/lib/auth/AuthProvider';

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
  const clear = useMutation({
    mutationFn: (item: { id: string; number: string; bank_name: string; amount: number; due_date: string; direction: 'in' | 'out'; notes: string; client_id: string; invoice_id: string }) =>
      updateCheque(item.id, { ...item, status: 'cleared' }),
    onSuccess: () => invalidateFinance(),
    onError: (error) => Alert.alert('تعذر الصرف', error instanceof Error ? error.message : ''),
  });
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></Pressable>
        <Text style={styles.title}>الشيكات</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="بحث برقم الشيك" placeholderTextColor={C.inkFaint} style={styles.search} textAlign="right" />
        <Button label="شيك جديد" onPress={() => setKind('cheque')} />
      </View>
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        ListEmptyComponent={query.isLoading ? <Skeleton /> : <EmptyState title="لا شيكات" body="أضف شيكاً واردًا أو صادرًا للمتابعة." />}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>شيك {item.number}</Text>
            <Text style={styles.meta}>{item.client_name || item.bank_name} · {chequeStatusLabel(item.status)} · {item.due_date}</Text>
            <Text style={styles.meta}>{item.direction === 'in' ? 'وارد' : 'صادر'} · {money(item.amount, symbol)}</Text>
            {item.status !== 'cleared' && item.status !== 'cancelled' ? (
              <Button
                label="تعليم كمقبوض"
                disabled={offline || clear.isPending}
                onPress={() =>
                  Alert.alert('صرف الشيك', 'سيتم إنشاء دفعة في النظام المحاسبي عند الشيكات الواردة.', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تأكيد', onPress: () => clear.mutate(item) },
                  ])
                }
              />
            ) : null}
          </Card>
        )}
      />
      <QuickActions kind={kind} onClose={() => setKind(null)} />
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
