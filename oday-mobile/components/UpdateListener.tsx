import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { listenForOtaUpdates } from '@/lib/updates';
import { C, FONT_BODY_MED, RADIUS } from '@/theme';

export function UpdateListener() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return listenForOtaUpdates(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.banner}>
        <Text style={styles.text}>تم تنزيل تحديث جديد. أعد فتح التطبيق لتطبيقه.</Text>
        <Pressable
          onPress={() => {
            void Updates.reloadAsync();
          }}
          style={styles.action}
        >
          <Text style={styles.actionText}>تطبيق الآن</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: C.sidebar,
    borderWidth: 1,
    borderColor: C.limeDeep,
    gap: 10,
  },
  text: {
    color: C.sidebarTitle,
    fontFamily: FONT_BODY_MED,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  action: {
    alignSelf: 'flex-end',
    backgroundColor: C.lime,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    color: C.ink,
    fontFamily: FONT_BODY_MED,
    fontSize: 13,
  },
});
