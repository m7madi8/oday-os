import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, type LucideIcon } from 'lucide-react-native';
import { C, FONT_BODY, FONT_HEAD, FONT_SERIF, RADIUS, SHADOW } from '@/theme';

export function StatCard({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.statCard, pressed && onPress && styles.pressed]}>
      <View style={styles.statTop}>
        <View style={styles.statChip}>
          <Icon size={15} color={C.ink} strokeWidth={1.8} />
        </View>
        {onPress ? <ArrowUpRight size={14} color={C.inkSoft} strokeWidth={2} /> : null}
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function FinanceCard({
  label,
  value,
  kind = 'net',
  featured = false,
}: {
  label: string;
  value: string;
  kind?: 'net' | 'income' | 'expense';
  featured?: boolean;
}) {
  const accent = kind === 'expense' ? C.burgundy : kind === 'income' ? C.emerald : C.inkSoft;
  return (
    <View style={[styles.financeCard, featured && styles.financeHero]}>
      {!featured ? <View style={[styles.trendDot, { backgroundColor: accent }]} /> : null}
      <Text style={[styles.financeNumber, featured && styles.financeNumberHero]}>{value}</Text>
      <Text style={styles.financeLabel}>{label}</Text>
    </View>
  );
}

export function ResourceCard({
  title,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.resourceCard, pressed && onPress && styles.pressed]}>
      <View style={styles.resourceHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.resourceTitle}>{title}</Text>
          {subtitle ? <Text style={styles.resourceSub}>{subtitle}</Text> : null}
        </View>
        {onPress ? <ArrowUpRight size={14} color={C.inkSoft} strokeWidth={2} /> : null}
      </View>
      {meta?.length ? (
        <View style={styles.resourceMeta}>
          {meta.map((item) => (
            <View key={item.label} style={styles.resourceMetaItem}>
              <Text style={styles.resourceMetaLabel}>{item.label}</Text>
              <Text style={styles.resourceMetaValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.985 }] },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 8,
    ...SHADOW.sm,
  },
  statTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    color: C.ink,
    fontFamily: FONT_SERIF,
    fontSize: 24,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statLabel: {
    color: C.inkSoft,
    fontFamily: FONT_BODY,
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  financeCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 6,
    ...SHADOW.sm,
  },
  financeHero: {
    minHeight: 132,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  financeNumber: {
    color: C.ink,
    fontFamily: FONT_SERIF,
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'right',
  },
  financeNumberHero: {
    fontSize: 26,
  },
  financeLabel: {
    color: C.inkSoft,
    fontFamily: FONT_BODY,
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resourceCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    padding: 16,
    gap: 12,
    ...SHADOW.sm,
  },
  resourceHead: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
  },
  resourceTitle: {
    color: C.ink,
    fontFamily: FONT_HEAD,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resourceSub: {
    color: C.inkSoft,
    fontFamily: FONT_BODY,
    fontSize: 12.5,
    marginTop: 2,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  resourceMeta: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  resourceMetaItem: {
    width: '47%',
    gap: 2,
  },
  resourceMetaLabel: {
    color: C.inkSoft,
    fontFamily: FONT_BODY,
    fontSize: 11,
    textAlign: 'right',
  },
  resourceMetaValue: {
    color: C.ink,
    fontFamily: FONT_SERIF,
    fontSize: 14,
    textAlign: 'right',
  },
  surface: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.sm,
  },
});

