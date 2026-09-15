import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { listClients } from '@/lib/api/clients';
import { keys } from '@/lib/query';
import { primaryContact } from '@/lib/api/client';
import { useDebounced, useOffline } from '@/hooks/useOffline';
import { C, FONT_BODY, FONT_HEAD, TAP, money, currencyFromId } from '@/theme';
import { Card, EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/Blocks';
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OfflineBanner visible={offline} />
      <View style={styles.head}>
        <Text style={styles.title}>العملاء</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الهاتف" placeholderTextColor={C.inkFaint} style={styles.search} textAlign="right" />
        <Button label="عميل جديد" onPress={() => setKind('client')} />
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
            <View style={{ gap: 10 }}><Skeleton /><Skeleton /></View>
          ) : (
            <EmptyState title="لا عملاء" body="أضف عميلاً لربط المشاريع والفواتير." />
          )
        }
        renderItem={({ item }) => {
          const contact = primaryContact(item);
          return (
            <Pressable onPress={() => router.push(`/clients/${item.id}`)}>
              <Card>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{contact?.phone || item.phone || 'بدون هاتف'} · {contact?.email || 'بدون بريد'}</Text>
                <Text style={styles.meta}>المستحق {money(item.balance, symbol)} · {item.balance > 0 ? 'عليه رصيد' : 'حساب مسدّد'}</Text>
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
