import { Redirect, Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, Users, Wallet, MoreHorizontal } from 'lucide-react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { C } from '@/theme';
import { LoadingBlock } from '@/components/ui/Blocks';
import { OsTabBar } from '@/components/ui/Chrome';
import { View } from 'react-native';

export default function TabsLayout() {
  const { ready, session } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper, justifyContent: 'center' }}>
        <LoadingBlock />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      tabBar={(props) => <OsTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.inkFaint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'اليوم', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={18} strokeWidth={1.8} /> }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: 'المشاريع', tabBarIcon: ({ color }) => <FolderKanban color={color} size={18} strokeWidth={1.8} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'العملاء', tabBarIcon: ({ color }) => <Users color={color} size={18} strokeWidth={1.8} /> }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'المال', tabBarIcon: ({ color }) => <Wallet color={color} size={18} strokeWidth={1.8} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={18} strokeWidth={1.8} /> }}
      />
    </Tabs>
  );
}

