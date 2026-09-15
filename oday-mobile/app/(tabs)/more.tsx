import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, Files, LogOut, Settings } from 'lucide-react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { displayName } from '@/lib/permissions';
import { C, FONT_BODY, FONT_HEAD } from '@/theme';

export default function MoreScreen() {
  const { session, logout } = useAuth();
  const router = useRouter();

  const confirmLogout = () => {
    Alert.alert('تسجيل الخروج', 'سيتم إنهاء الجلسة على هذا الجهاز فقط.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>المزيد</Text>
        <Text style={styles.sub}>{displayName(session?.user)} · {session?.user.email}</Text>
        <Item icon={<Sparkles color={C.bronze2} size={20} />} label="المساعد الذكي" onPress={() => router.push('/ai')} />
        <Item icon={<Files color={C.bronze2} size={20} />} label="المستندات" onPress={() => router.push('/documents')} />
        <Item icon={<Settings color={C.bronze2} size={20} />} label="الشركة" meta={session?.company.name} />
        <Item icon={<LogOut color={C.burgundy} size={20} />} label="تسجيل الخروج" onPress={confirmLogout} />
      </View>
    </SafeAreaView>
  );
}

function Item({ icon, label, meta, onPress }: { icon: React.ReactNode; label: string; meta?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.item}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {meta ? <Text style={styles.sub}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  content: { padding: 20, gap: 12 },
  title: { fontFamily: FONT_HEAD, fontSize: 28, color: C.ink, textAlign: 'right' },
  sub: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right' },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  label: { fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, textAlign: 'right' },
});
