import { Redirect, Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, Users, Wallet, MoreHorizontal } from 'lucide-react-native';
import { useAuth } from '@/lib/auth/AuthProvider';
import { C, FONT_BODY_MED } from '@/theme';
import { LoadingBlock } from '@/components/ui/Blocks';
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.sidebar,
        tabBarInactiveTintColor: C.inkFaint,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: C.border,
          height: 64,
        },
        tabBarLabelStyle: { fontFamily: FONT_BODY_MED, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'الرئيسية', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: 'المشاريع', tabBarIcon: ({ color }) => <FolderKanban color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="clients"
        options={{ title: 'العملاء', tabBarIcon: ({ color }) => <Users color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'المالية', tabBarIcon: ({ color }) => <Wallet color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: 'المزيد', tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={22} /> }}
      />
    </Tabs>
  );
}
