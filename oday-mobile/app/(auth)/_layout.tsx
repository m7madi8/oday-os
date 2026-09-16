import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LoadingBlock } from '@/components/ui/Blocks';
import { View } from 'react-native';
import { C } from '@/theme';

export default function AuthLayout() {
  const { ready, session } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sidebar, justifyContent: 'center', padding: 24 }}>
        <LoadingBlock />
      </View>
    );
  }
  if (session) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.sidebar } }} />;
}
