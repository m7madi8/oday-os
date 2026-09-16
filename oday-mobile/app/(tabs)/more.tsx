import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Files, LogOut, Settings } from 'lucide-react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { displayName } from '@/lib/permissions';
import { getApiUrl } from '@/lib/server';
import { C, FONT_BODY, FONT_HEAD, LAYOUT } from '@/theme';
import { ScreenShell } from '@/components/ui/Chrome';

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
    <ScreenShell title="المزيد">
      <View style={styles.content}>
        <Text style={styles.sub}>{displayName(session?.user)} · {session?.user.email}</Text>
        <Item icon={<Sparkles color={C.limeDeep} size={20} />} label="المساعد الذكي" onPress={() => router.push('/ai')} />
        <Item icon={<Files color={C.limeDeep} size={20} />} label="المستندات" onPress={() => router.push('/documents')} />
        <Item icon={<Settings color={C.limeDeep} size={20} />} label="الشركة" meta={session?.company.name} />
        <Item icon={<Settings color={C.limeDeep} size={20} />} label="الخادم" meta={getApiUrl()} />
        <Item icon={<LogOut color={C.burgundy} size={20} />} label="تسجيل الخروج" onPress={confirmLogout} />
      </View>
    </ScreenShell>
  );
}

function Item({ icon, label, meta, onPress }: { icon: React.ReactNode; label: string; meta?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {meta ? <Text style={styles.sub}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: LAYOUT.contentPadBottom },
  sub: { fontFamily: FONT_BODY, color: C.inkSoft, textAlign: 'right', marginBottom: 4 },
  item: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 16,
  },
  itemPressed: { transform: [{ scale: 0.985 }] },
  label: { fontFamily: FONT_HEAD, fontSize: 16, color: C.ink, textAlign: 'right' },
});
