import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useSessionStatus } from '@/features/auth/session';

export default function AuthLayout() {
  const status = useSessionStatus();
  if (status === 'loading') return null;
  if (status === 'authenticated') return <Redirect href="/(app)/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
