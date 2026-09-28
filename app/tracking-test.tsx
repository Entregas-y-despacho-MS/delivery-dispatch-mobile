import { Redirect } from 'expo-router';
import TrackingScreen from '@/features/tracking/TrackingScreen';

export default function TrackingTestRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <TrackingScreen />;
}
