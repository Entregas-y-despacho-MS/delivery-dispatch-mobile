import { Redirect } from 'expo-router';
import TrackingTestScreen from '@/features/tracking/TrackingTestScreen';

export default function TrackingTestRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <TrackingTestScreen />;
}
