import { Stack, useLocalSearchParams } from 'expo-router';
import { AppText, Card, Screen } from '@/components/ui';
import TrackingScreen from '@/features/tracking/TrackingScreen';

export default function DeliveryTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatchId = typeof id === 'string' && /^[1-9]\d*$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(dispatchId)) {
    return <Screen><Card><AppText variant="heading">Despacho inválido</AppText>
      <AppText>Abre esta pantalla con el ID de un despacho válido.</AppText></Card></Screen>;
  }
  return <><Stack.Screen options={{ headerShown: true, title: `Despacho ${dispatchId}` }} />
    <TrackingScreen dispatchId={dispatchId} /></>;
}
