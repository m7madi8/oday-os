import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { C, FONT_BODY, FONT_HEAD } from '@/theme';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'غير موجود', headerShown: false }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>الصفحة غير موجودة</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>العودة للرئيسية</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontFamily: FONT_HEAD, fontSize: 22, color: C.ink },
  link: { padding: 12 },
  linkText: { fontFamily: FONT_BODY, color: C.limeDeep },
});
