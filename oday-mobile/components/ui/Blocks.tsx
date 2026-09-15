import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, FONT_BODY, FONT_HEAD, RADIUS, shadow } from '@/theme';
import { Button } from '@/components/ui/Button';

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={[styles.skeleton, { height }]} />;
}

export function LoadingBlock() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={C.bronze2} />
      <Text style={styles.sub}>جارٍ التحميل…</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{body}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>تعذر التحميل</Text>
      <Text style={styles.sub}>{message || 'تحقق من الاتصال ثم أعد المحاولة.'}</Text>
      {onRetry ? <Button label="إعادة المحاولة" onPress={onRetry} /> : null}
    </View>
  );
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.offline}>
      <Text style={styles.offlineText}>لا يوجد اتصال — العرض من الذاكرة المؤقتة فقط</Text>
    </View>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.sub}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {hint ? <Text style={styles.sub}>{hint}</Text> : null}
    </View>
  );
}

export function Row({
  title,
  meta,
  amount,
  onPress,
}: {
  title: string;
  meta?: string;
  amount?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.sub}>{meta}</Text> : null}
      </View>
      {amount ? <Text style={styles.amount}>{amount}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: RADIUS,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  title: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 18, writingDirection: 'rtl', textAlign: 'right' },
  sub: { color: C.inkSoft, fontFamily: FONT_BODY, fontSize: 13, writingDirection: 'rtl', textAlign: 'right' },
  skeleton: { backgroundColor: C.tint, borderRadius: RADIUS },
  center: { gap: 12, paddingVertical: 28, alignItems: 'stretch' },
  offline: { backgroundColor: C.burgundySoft, paddingVertical: 8, paddingHorizontal: 16 },
  offlineText: { color: C.burgundy, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 13 },
  kpi: { flex: 1, minWidth: '47%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS, padding: 14, gap: 6, ...shadow },
  kpiValue: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowTitle: { color: C.ink, fontFamily: FONT_BODY, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  amount: { color: C.bronze2, fontFamily: FONT_HEAD, fontSize: 14 },
});
