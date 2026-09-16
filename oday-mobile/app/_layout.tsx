import { useEffect } from 'react';
import { I18nManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  NotoKufiArabic_600SemiBold,
  NotoKufiArabic_700Bold,
} from '@expo-google-fonts/noto-kufi-arabic';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { AppProviders } from '@/lib/auth/AuthProvider';
import { UpdateListener } from '@/components/UpdateListener';
import { C } from '@/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  const [loaded] = useFonts({
    NotoKufiArabic_600SemiBold,
    NotoKufiArabic_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: C.sidebar }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <UpdateListener />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }}>
          <Stack.Screen name="(auth)" options={{ contentStyle: { backgroundColor: C.sidebar } }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="projects/[id]" />
          <Stack.Screen name="clients/[id]" />
          <Stack.Screen name="finance/invoices" />
          <Stack.Screen name="finance/payments" />
          <Stack.Screen name="finance/expenses" />
          <Stack.Screen name="finance/cheques" />
          <Stack.Screen name="ai/index" />
          <Stack.Screen name="documents" />
        </Stack>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
