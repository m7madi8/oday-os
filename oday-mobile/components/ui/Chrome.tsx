import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, FONT_BODY, FONT_BODY_MED, FONT_HEAD_BOLD, LAYOUT, P, SHADOW } from '@/theme';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, {
    options: {
      title?: string;
      tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
    };
  }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

type ScreenProps = ViewProps & {
  title?: string;
  trailing?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  padBottom?: number;
};

export function ScreenHeader({ title, trailing, onBack }: { title: string; trailing?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.topbar}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <Text style={styles.backText}>رجوع</Text>
        </Pressable>
      ) : null}
      <View style={styles.topbarCenter}>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {trailing ? <View style={styles.topbarTrail}>{trailing}</View> : null}
    </View>
  );
}

export function ScreenShell({ title, trailing, onBack, children, style, padBottom, ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = padBottom ?? (onBack ? 24 : LAYOUT.contentPadBottom);
  return (
    <View
      style={[styles.shell, { paddingTop: insets.top, paddingBottom: bottom }, style]}
      {...rest}
    >
      {title ? <ScreenHeader title={title} trailing={trailing} onBack={onBack} /> : null}
      {children}
    </View>
  );
}

export function OsTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          const color = focused ? C.ink : P.tabInactive;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={[styles.tab, focused && styles.tabActive]}
            >
              {options.tabBarIcon?.({ focused, color, size: 18 })}
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: C.paper,
  },
  topbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.contentPadX,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: C.paper,
  },
  topbarCenter: { flex: 1, minWidth: 0 },
  topbarTrail: { marginStart: 8 },
  backBtn: { marginEnd: 8 },
  backText: { color: C.limeDeep, fontFamily: FONT_BODY, fontSize: 15 },
  pageTitle: {
    color: C.ink,
    fontFamily: FONT_HEAD_BOLD,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.4,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tabWrap: {
    position: 'absolute',
    left: LAYOUT.contentPadX,
    right: LAYOUT.contentPadX,
    bottom: 0,
    alignItems: 'center',
  },
  tabBar: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: C.sidebar,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 2,
    ...SHADOW.tabBar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 14,
    minWidth: 0,
  },
  tabActive: {
    backgroundColor: C.lime,
  },
  tabLabel: {
    color: P.tabInactive,
    fontFamily: FONT_BODY_MED,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: C.ink,
  },
});

