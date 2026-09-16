import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { listDocuments } from '@/lib/api/documents';
import { keys } from '@/lib/query';
import { getToken } from '@/lib/auth/session';
import { getApiUrl } from '@/lib/server';
import { LAYOUT } from '@/theme';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Blocks';
import { ResourceCard } from '@/components/ui/Cards';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';

export default function DocumentsScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: keys.documents, queryFn: () => listDocuments({ per_page: 30 }) });

  const share = async (id: string, name?: string) => {
    try {
      const token = await getToken();
      const FileSystem = await import('expo-file-system/legacy').catch(() => import('expo-file-system'));
      const directory = (FileSystem as { cacheDirectory?: string }).cacheDirectory;
      if (!directory || !('downloadAsync' in FileSystem)) {
        Alert.alert('المستند', 'استخدم معاينة آمنة عبر الخادم.');
        return;
      }
      const target = `${directory}${name || `document-${id}`}`;
      const result = await (FileSystem as { downloadAsync: Function }).downloadAsync(
        `${getApiUrl()}/api/v1/documents/${id}/download`,
        target,
        { headers: { 'X-API-TOKEN': token ?? '' } },
      );
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (error) {
      Alert.alert('تعذر الفتح', error instanceof Error ? error.message : '');
    }
  };

  return (
    <ScreenShell title="المستندات" onBack={() => router.back()}>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={query.data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListEmptyComponent={!query.isLoading ? <EmptyState title="لا مستندات" body="المرفقات تظهر هنا بعد رفعها من النظام." /> : null}
        renderItem={({ item }) => (
          <View style={{ gap: 10 }}>
            <ResourceCard title={item.name || 'مستند'} subtitle={item.type || 'ملف'} />
            <Button label="عرض / مشاركة" onPress={() => share(item.id, item.name)} />
          </View>
        )}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 24 },
});
