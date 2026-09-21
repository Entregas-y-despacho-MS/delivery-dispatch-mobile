import { Tabs } from 'expo-router';
import { ClipboardList, History, UserRound } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarStyle: { height: 68, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Mi ruta', tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} /> }} />
    <Tabs.Screen name="history" options={{ title: 'Historial', tabBarIcon: ({ color }) => <History size={22} color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <UserRound size={22} color={color} /> }} />
  </Tabs>;
}
