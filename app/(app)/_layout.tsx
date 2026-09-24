import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useSessionStatus } from '@/features/auth/session';

export default function AppLayout() {
  const status = useSessionStatus();
  if (status === 'loading') return null;
  if (status !== 'authenticated') return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
