import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { C, FONT_BODY, FONT_BODY_MED, RADIUS, TAP } from '@/theme';

type Props = TextInputProps & {
  label: string;
  inverted?: boolean;
};

export function Field({ label, inverted, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, inverted && { color: C.lime }]}>{label}</Text>
      <TextInput
        placeholderTextColor={C.inkFaint}
        style={[styles.input, style]}
        textAlign="right"
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: C.inkSoft, fontFamily: FONT_BODY_MED, fontSize: 13, writingDirection: 'rtl' },
  input: {
    minHeight: TAP,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    color: C.ink,
    fontFamily: FONT_BODY,
    fontSize: 16,
    writingDirection: 'rtl',
  },
});
