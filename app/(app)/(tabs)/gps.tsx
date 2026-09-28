import { Redirect } from 'expo-router';
import TrackingScreen from '@/features/tracking/TrackingScreen';

export default function GpsTab() {
  if (!__DEV__) return <Redirect href="/(app)/(tabs)" />;
  return <TrackingScreen allowManualDispatchId />;
}
