import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { C, FONT_BODY_SEMI, TAP } from '@/theme';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  tone?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
};

export function Button({ label, tone = 'primary', loading, disabled, ...rest }: Props) {
  const background = tone === 'primary' ? C.sidebar : tone === 'danger' ? C.burgundySoft : C.tint;
  const color = tone === 'primary' ? C.white : tone === 'danger' ? C.burgundy : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, opacity: pressed || disabled || loading ? 0.72 : 1 },
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.label, { color }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: FONT_BODY_SEMI,
    fontSize: 16,
  },
});
