import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, FONT_BODY, FONT_BODY_MED, FONT_HEAD, LAYOUT, RADIUS, SHADOW, TAP } from '@/theme';
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

export function SearchField({
  value,
  onChangeText,
  placeholder = 'بحث',
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.inkFaint}
      style={styles.search}
      textAlign="right"
    />
  );
}

export function Skeleton({ height = 72 }: { height?: number }) {
  return <View style={[styles.skeleton, { height }]} />;
}

export function LoadingBlock() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={C.ink} />
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
    <View style={styles.status}>
      <Text style={styles.statusTitle}>{message || 'تعذر تحميل البيانات. أعد المحاولة.'}</Text>
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
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.sub}>{label}</Text>
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

export function ActionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 12,
    ...SHADOW.sm,
  },
  title: {
    color: C.ink,
    fontFamily: FONT_HEAD,
    fontSize: 18,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sub: {
    color: C.inkSoft,
    fontFamily: FONT_BODY,
    fontSize: 13,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  search: {
    minHeight: TAP,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    fontFamily: FONT_BODY,
    color: C.ink,
    ...SHADOW.sm,
  },
  skeleton: { backgroundColor: C.tint, borderRadius: RADIUS.lg },
  center: { gap: 12, paddingVertical: 28, alignItems: 'stretch' },
  status: {
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.burgundySoft,
    borderStartWidth: 1,
    borderStartColor: C.burgundy,
  },
  statusTitle: {
    color: C.ink,
    fontFamily: FONT_BODY_MED,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  offline: { backgroundColor: C.burgundySoft, paddingVertical: 8, paddingHorizontal: 16 },
  offlineText: { color: C.burgundy, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 13 },
  kpi: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 6,
    ...SHADOW.sm,
  },
  kpiValue: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 22, textAlign: 'right' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  rowTitle: { color: C.ink, fontFamily: FONT_BODY_MED, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  amount: { color: C.ink, fontFamily: FONT_HEAD, fontSize: 14 },
  chip: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...SHADOW.sm,
  },
  chipPressed: { backgroundColor: C.tint },
  chipText: { color: C.ink, fontFamily: FONT_BODY_MED, fontSize: 14, textAlign: 'right' },
});
