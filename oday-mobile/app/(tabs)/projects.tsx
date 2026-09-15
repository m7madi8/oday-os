import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listProjects } from '@/lib/api/projects';
import { keys } from '@/lib/query';
import { projectFinance } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, TAP, money } from '@/theme';
import { Card, EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/Blocks';
import { Button } from '@/components/ui/Button';
import { QuickActions, type QuickKind } from '@/features/actions/QuickActions';
import { useAuth } from '@/lib/auth/AuthProvider';
import { currencyFromId } from '@/theme';

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner visible={offline} />
      <View style={styles.head}>
        <Text style={styles.title}>المشاريع</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="بحث" placeholderTextColor={C.inkFaint} style={styles.search} textAlign="right" />
        <Button label="مشروع جديد" onPress={() => setKind('project')} />
      </View>
      {query.isError ? <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
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
            <Pressable onPress={() => router.push(`/projects/${item.id}`)}>
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.client?.name || 'بدون عميل'} · {item.due_date || 'بدون تاريخ'}</Text>
                <Text style={styles.meta}>
                  القيمة {money(finance.value, symbol)} · المدفوع {money(finance.paid, symbol)} · المتبقي {money(finance.remaining, symbol)}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
      <QuickActions kind={kind} onClose={() => setKind(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  head: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  title: { fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, textAlign: 'right' },
  search: { minHeight: TAP, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 14, fontFamily: FONT_BODY, color: C.ink },
  name: { fontFamily: FONT_HEAD, fontSize: 18, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
});
