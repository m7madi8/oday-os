import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { chat } from '@/lib/api/ai';
import { ApiError } from '@/lib/api/client';
import { C, FONT_BODY, LAYOUT, RADIUS, TAP } from '@/theme';
import { ActionChip } from '@/components/ui/Blocks';
import { ScreenShell } from '@/components/ui/Chrome';
import { Button } from '@/components/ui/Button';
import { useOffline } from '@/hooks/useOffline';

const PROMPTS = [
  'مين عليه دفعات متأخرة؟',
  'شو المشاريع اللي لازم أتابعها؟',
  'كم إجمالي المستحقات؟',
  'اعطيني ملخص مالي لهذا الشهر.',
];

type Turn = { role: 'user' | 'assistant'; content: string };

export default function AiScreen() {
  const router = useRouter();
  const offline = useOffline();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([
    { role: 'assistant', content: 'اسأل عن المستحقات، المشاريع، أو وضع عميل — الإجابة من بيانات المكتب الحقيقية.' },
  ]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading || offline) return;
    const history = turns;
    setTurns((current) => [...current, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const result = await chat(message, history);
      setTurns((current) => [...current, { role: 'assistant', content: result.reply }]);
    } catch (error) {
      const code = error instanceof ApiError ? String((error.payload as { code?: string } | null)?.code ?? '') : '';
      const fallback =
        error instanceof ApiError && (error.status === 503 || code === 'AI_NOT_CONFIGURED')
          ? 'المساعد غير مُعد على الخادم. أضف ODAY_AI_API_KEY في بيئة Laravel.'
          : error instanceof ApiError
            ? error.message
            : 'تعذر الحصول على إجابة.';
      setTurns((current) => [...current, { role: 'assistant', content: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="المساعد الذكي" onBack={() => router.back()} padBottom={0}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.thread}>
          {turns.map((turn, index) => (
            <View key={`${turn.role}-${index}`} style={[styles.bubble, turn.role === 'user' ? styles.user : styles.bot]}>
              <Text style={[styles.bubbleText, turn.role === 'user' && { color: C.sidebarTitle }]}>{turn.content}</Text>
            </View>
          ))}
          <View style={styles.prompts}>
            {PROMPTS.map((prompt) => (
              <ActionChip key={prompt} label={prompt} onPress={() => send(prompt)} />
            ))}
          </View>
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="اكتب سؤالك"
            placeholderTextColor={C.inkFaint}
            style={styles.input}
            textAlign="right"
            editable={!offline}
          />
          <Button label="إرسال" loading={loading} disabled={!input.trim() || offline} onPress={() => send(input)} />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  thread: { paddingHorizontal: LAYOUT.contentPadX, gap: 10, paddingBottom: 20 },
  bubble: { borderRadius: RADIUS.lg, padding: 14, maxWidth: '92%' },
  user: { alignSelf: 'flex-start', backgroundColor: C.sidebar },
  bot: { alignSelf: 'flex-end', backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  bubbleText: { fontFamily: FONT_BODY, color: C.ink, writingDirection: 'rtl', textAlign: 'right' },
  prompts: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  composer: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card },
  input: { minHeight: TAP, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, paddingHorizontal: 14, fontFamily: FONT_BODY, color: C.ink },
});
