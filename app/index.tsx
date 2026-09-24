import { Redirect } from 'expo-router';
import { useSessionStatus } from '@/features/auth/session';

export default function Index() {
  const status = useSessionStatus();
  if (status === 'loading') return null;
  return <Redirect href={status === 'authenticated' ? '/(app)/(tabs)' : '/(auth)/login'} />;
}
