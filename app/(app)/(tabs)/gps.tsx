import { Redirect } from 'expo-router';
import TrackingTestScreen from '@/features/tracking/TrackingTestScreen';

export default function GpsTab() {
  if (!__DEV__) return <Redirect href="/(app)/(tabs)" />;
  return <TrackingTestScreen />;
}
