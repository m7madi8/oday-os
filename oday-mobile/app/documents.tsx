import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { listDocuments } from '@/lib/api/documents';
import { keys } from '@/lib/query';
import { getToken } from '@/lib/auth/session';
import { ENV } from '@/config/env';
import { C, FONT_BODY, FONT_HEAD } from '@/theme';
import { Card, EmptyState, ErrorState, LoadingBlock } from '@/components/ui/Blocks';
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
        `${ENV.apiUrl}/api/v1/documents/${id}/download`,
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></Pressable>
        <Text style={styles.title}>المستندات</Text>
      </View>
      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorState onRetry={() => query.refetch()} /> : null}
      <FlatList
        data={query.data?.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListEmptyComponent={!query.isLoading ? <EmptyState title="لا مستندات" body="المرفقات تظهر هنا بعد رفعها من النظام." /> : null}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.name}>{item.name || 'مستند'}</Text>
            <Text style={styles.meta}>{item.type || 'ملف'}</Text>
            <Button label="عرض / مشاركة" onPress={() => share(item.id, item.name)} />
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
  name: { fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, textAlign: 'right' },
  meta: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
});
