import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { precheckLogin } from '@/lib/api/auth';
import { pingServer } from '@/lib/api/health';
import { ApiError } from '@/lib/api/client';
import { isOfficeLogin } from '@/lib/auth/office';
import {
  defaultServerUrl,
  isPhysicalDeviceLoopback,
  loadStoredServerUrl,
  persistServerUrl,
} from '@/lib/server';
import { OE, C } from '@/theme';

const portrait = require('@/assets/images/owner-portrait-desktop.webp');

const FONT_DISPLAY = Platform.select({ ios: undefined, default: 'sans-serif' }) as string | undefined;
const FONT_TEXT = Platform.select({ ios: undefined, default: 'sans-serif' }) as string | undefined;

const APPLE = {
  fieldRadius: 10,
  buttonRadius: 12,
} as const;

const t = {
  ownerRole: 'المؤسس والشريك الرئيسي',
  serverLabel: 'عنوان الخادم',
  serverPlaceholder: Platform.OS === 'web' ? 'http://127.0.0.1:8000' : 'http://192.168.1.13:8000',
  serverHint:
    Platform.OS === 'web'
      ? 'على الكمبيوتر استخدم 127.0.0.1:8000 مع php artisan serve'
      : 'استخدم IP جهاز الكمبيوتر على الشبكة، وليس 127.0.0.1',
  serverRequired: 'أدخل عنوان خادم Laravel.',
  serverLoopback: 'على الهاتف استخدم IP الشبكة (مثل 192.168.x.x) وليس 127.0.0.1',
  userLabel: 'اسم المستخدم',
  userPlaceholder: 'oday',
  passwordLabel: 'كلمة المرور',
  forgot: 'نسيت كلمة المرور؟',
  forgotTitle: 'استعادة الدخول',
  forgotBody: 'تواصل مع إدارة المكتب لإعادة تعيين كلمة المرور.',
  submit: 'تسجيل الدخول',
  submitting: 'جارٍ التحقق…',
  signedIn: 'تم تسجيل الدخول',
  otpLabel: 'رمز التحقق',
  errorRequired: 'الرجاء إدخال اسم المستخدم وكلمة المرور.',
  errorAuth: 'تعذر تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.',
  showPassword: 'إظهار كلمة المرور',
  hidePassword: 'إخفاء كلمة المرور',
  footer: 'خاص ومحمي',
} as const;

type Status = 'idle' | 'loading' | 'error' | 'success';

function displayType(size: number) {
  return {
    ...(FONT_DISPLAY ? { fontFamily: FONT_DISPLAY } : {}),
    fontWeight: '600' as const,
    fontSize: size,
    letterSpacing: Platform.OS === 'ios' ? -0.35 : 0,
  };
}

function bodyType(size: number, weight: '400' | '500' | '600' = '400') {
  return {
    ...(FONT_TEXT ? { fontFamily: FONT_TEXT } : {}),
    fontWeight: weight,
    fontSize: size,
    letterSpacing: Platform.OS === 'ios' ? -0.1 : 0,
  };
}

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [serverUrl, setServerUrl] = useState(defaultServerUrl());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needOtp, setNeedOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState<'server' | 'user' | 'password' | 'otp' | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const rtl = true;
  const Arrow = ArrowLeft;
  const invalid = status === 'error';

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    loadStoredServerUrl().then(() => {
      setServerUrl(defaultServerUrl());
    });
  }, []);

  const submit = async () => {
    if (status === 'loading' || status === 'success') return;

    const user = username.trim();
    const pass = password.trim();

    if (!user || !pass) {
      setStatus('error');
      setErrorMsg(t.errorRequired);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      if (isOfficeLogin(user, pass)) {
        await login(user, pass);
        setStatus('success');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const nextServer = await persistServerUrl(serverUrl);
      if (!nextServer) {
        setStatus('error');
        setErrorMsg(t.serverRequired);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (isPhysicalDeviceLoopback(nextServer)) {
        setStatus('error');
        setErrorMsg(t.serverLoopback);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const health = await pingServer(nextServer);
      if (!health.ok) {
        setStatus('error');
        setErrorMsg(health.message);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      if (!needOtp) {
        const check = await precheckLogin(user);
        if (check.totp_required) {
          setNeedOtp(true);
          setStatus('idle');
          return;
        }
      }
      await login(user, pass, otp || undefined);
      setStatus('success');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t.errorAuth;
      if (message.includes('رمز التحقق') || (err instanceof ApiError && err.status === 400 && !needOtp)) {
        setNeedOtp(true);
        setStatus('idle');
        return;
      }
      setStatus('error');
      setErrorMsg(message || t.errorAuth);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={[styles.root, { direction: 'rtl' }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.shell}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(1400)}
          style={styles.visual}
        >
          <Image
            source={portrait}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ top: '8%', left: '50%' }}
            accessibilityIgnoresInvertColors
          />
          <LinearGradient
            colors={[OE.black950, 'transparent']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0.74 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[OE.black950, 'transparent']}
            locations={[0, 0.2]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[OE.black950, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.16, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(700).duration(800)}
            style={styles.caption}
          >
            <Text style={styles.ownerName}>عدي أبو ضحى</Text>
            <Text style={styles.ownerRole}>{t.ownerRole}</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(350).duration(700)}
          style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 10) }]}
        >
          <View style={styles.topRow}>
            <Text style={styles.brand}>ODAY OS</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { textAlign: rtl ? 'right' : 'left' }]}>{t.serverLabel}</Text>
              <View style={[styles.inputWrap, invalid && styles.inputInvalid, focused === 'server' && styles.inputFocus]}>
                <TextInput
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  onFocus={() => setFocused('server')}
                  onBlur={() => setFocused((current) => (current === 'server' ? null : current))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  keyboardType="url"
                  placeholder={t.serverPlaceholder}
                  placeholderTextColor={OE.placeholder}
                  style={[styles.input, styles.ltrInput]}
                  accessibilityLabel={t.serverLabel}
                />
              </View>
              <Text style={styles.hint}>{t.serverHint}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { textAlign: rtl ? 'right' : 'left' }]}>{t.userLabel}</Text>
              <View style={[styles.inputWrap, invalid && styles.inputInvalid, focused === 'user' && styles.inputFocus]}>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocused('user')}
                  onBlur={() => setFocused((current) => (current === 'user' ? null : current))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  placeholder={t.userPlaceholder}
                  placeholderTextColor={OE.placeholder}
                  style={[styles.input, { textAlign: rtl ? 'right' : 'left' }]}
                  accessibilityLabel={t.userLabel}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>{t.passwordLabel}</Text>
                <Pressable
                  onPress={() => Alert.alert(t.forgotTitle, t.forgotBody)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t.forgot}
                >
                  <Text style={styles.forgot}>{t.forgot}</Text>
                </Pressable>
              </View>
              <View style={[styles.inputWrap, invalid && styles.inputInvalid, focused === 'password' && styles.inputFocus]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused((current) => (current === 'password' ? null : current))}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  placeholder="••••••••"
                  placeholderTextColor={OE.placeholder}
                  style={[styles.input, { textAlign: rtl ? 'right' : 'left', paddingEnd: 42, paddingStart: 15 }]}
                  accessibilityLabel={t.passwordLabel}
                />
                <Pressable
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eye}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? t.hidePassword : t.showPassword}
                  hitSlop={8}
                >
                  {showPassword ? <EyeOff size={17} color={OE.warm500} /> : <Eye size={17} color={OE.warm500} />}
                </Pressable>
              </View>
            </View>

            {needOtp ? (
              <View style={styles.field}>
                <Text style={[styles.label, { textAlign: rtl ? 'right' : 'left' }]}>{t.otpLabel}</Text>
                <View style={[styles.inputWrap, focused === 'otp' && styles.inputFocus]}>
                  <TextInput
                    value={otp}
                    onChangeText={setOtp}
                    onFocus={() => setFocused('otp')}
                    onBlur={() => setFocused((current) => (current === 'otp' ? null : current))}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    placeholderTextColor={OE.placeholder}
                    style={[styles.input, { textAlign: rtl ? 'right' : 'left' }]}
                    accessibilityLabel={t.otpLabel}
                  />
                </View>
              </View>
            ) : null}

            <View style={[styles.error, status === 'error' && styles.errorVisible]}>
              {status === 'error' ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
            </View>

            <Pressable
              onPress={submit}
              disabled={status === 'loading' || status === 'success'}
              style={({ pressed }) => [
                styles.submit,
                status === 'success' && styles.submitSuccess,
                pressed && status === 'idle' && styles.submitPressed,
                (status === 'loading' || status === 'success') && styles.submitBusy,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t.submit}
            >
              {status === 'loading' ? (
                <>
                  <ActivityIndicator size="small" color={OE.black950} />
                  <Text style={styles.submitLabel}>{t.submitting}</Text>
                </>
              ) : null}
              {status === 'success' ? (
                <>
                  <Check size={16} color={OE.paper50} />
                  <Text style={[styles.submitLabel, { color: OE.paper50 }]}>{t.signedIn}</Text>
                </>
              ) : null}
              {status !== 'loading' && status !== 'success' ? (
                <>
                  <Text style={styles.submitLabel}>{t.submit}</Text>
                  <Arrow size={16} color={OE.black950} />
                </>
              ) : null}
            </Pressable>
          </View>

          <Text style={styles.footer}>{t.footer}</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: OE.black950 },
  shell: { flex: 1 },
  visual: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: OE.black950,
  },
  caption: { paddingHorizontal: 20, paddingBottom: 12, zIndex: 2 },
  ownerName: {
    ...displayType(20),
    color: OE.paper50,
    marginBottom: 3,
  },
  ownerRole: {
    ...bodyType(13),
    color: OE.warm300,
  },
  panel: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  topRow: {
    marginBottom: 14,
  },
  brand: {
    ...displayType(20),
    color: OE.paper50,
  },
  pressed: { opacity: 0.72 },
  form: { gap: 12 },
  field: { gap: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: {
    ...bodyType(13),
    color: OE.warm500,
  },
  forgot: {
    ...bodyType(13),
    color: C.lime,
  },
  inputWrap: {
    height: 44,
    borderRadius: APPLE.fieldRadius,
    borderWidth: 1,
    borderColor: OE.line800,
    backgroundColor: OE.black850,
    justifyContent: 'center',
  },
  inputInvalid: { borderColor: OE.danger },
  inputFocus: { borderColor: C.limeDeep, backgroundColor: OE.black800 },
  input: {
    height: 44,
    paddingHorizontal: 16,
    color: OE.paper50,
    ...bodyType(17),
    letterSpacing: Platform.OS === 'ios' ? -0.35 : 0,
  },
  ltrInput: { textAlign: 'left', writingDirection: 'ltr' },
  hint: {
    ...bodyType(12),
    color: OE.warm500,
    textAlign: 'right',
  },
  eye: { position: 'absolute', end: 12, top: 13 },
  error: { minHeight: 0, overflow: 'hidden' },
  errorVisible: { minHeight: 18 },
  errorText: {
    ...bodyType(13),
    color: OE.danger,
    textAlign: 'center',
  },
  submit: {
    marginTop: 2,
    height: 50,
    borderRadius: APPLE.buttonRadius,
    backgroundColor: OE.paper50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitPressed: { backgroundColor: C.lime, transform: [{ scale: 0.99 }] },
  submitSuccess: { backgroundColor: OE.success },
  submitBusy: { opacity: 0.88 },
  submitLabel: {
    ...displayType(17),
    color: OE.black950,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: OE.line800,
    textAlign: 'center',
    ...bodyType(13),
    color: OE.warm500,
  },
});
