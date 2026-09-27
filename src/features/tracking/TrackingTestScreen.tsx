import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { AppText, Card, PrimaryButton, Screen } from '@/components/ui';
import { getLatestLocation, isTracking, reconcileTracking, type TrackingPoint } from '@/features/tracking';

export default function TrackingTestScreen() {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [point, setPoint] = useState<TrackingPoint | null>(null);
  const [message, setMessage] = useState('Consulta el estado o inicia la prueba.');

  const refresh = useCallback(async () => {
    const [isActive, latest] = await Promise.all([isTracking(), getLatestLocation()]);
    setActive(isActive);
    setPoint(latest);
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      void refresh().catch((error) => setMessage(String(error)));
    }, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch((error) => setMessage(String(error)));
    });
    return () => {
      clearTimeout(initialRefresh);
      subscription.remove();
    };
  }, [refresh]);

  async function run(action: 'start' | 'stop' | 'refresh') {
    if (busy) return;
    setBusy(true);
    try {
      if (action === 'start') {
        const result = await reconcileTracking(1);
        setMessage(result.status === 'tracking'
          ? 'Seguimiento activo. Muévete con el teléfono o simula una ruta y vuelve a esta pantalla.'
          : `No se inició: ${result.status}. Revisa los permisos en Ajustes.`);
      } else if (action === 'stop') {
        await reconcileTracking(0);
        setMessage('Seguimiento detenido. La última lectura se conserva para comparar.');
      }
      await refresh();
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View className="gap-5">
        <View className="gap-2">
          <AppText variant="caption">Solo desarrollo · ST-77.1</AppText>
          <AppText variant="title">Prueba GPS</AppText>
          <AppText>Inicia un despacho de prueba para verificar la ubicación en segundo plano en este dispositivo.</AppText>
        </View>

        <Card className="gap-3">
          <AppText variant="heading">Estado del servicio</AppText>
          <AppText>{active ? 'Activo' : 'Detenido'}</AppText>
          <AppText accessibilityLiveRegion="polite">{message}</AppText>
        </Card>

        <Card className="gap-3">
          <AppText variant="heading">Última lectura válida</AppText>
          {point ? (
            <>
              <AppText>Latitud: {point.latitude.toFixed(6)}</AppText>
              <AppText>Longitud: {point.longitude.toFixed(6)}</AppText>
              <AppText>Precisión: {point.accuracyMeters.toFixed(1)} m</AppText>
              <AppText>Hora: {new Date(point.capturedAt).toLocaleString()}</AppText>
            </>
          ) : <AppText>Aún no hay una lectura válida.</AppText>}
        </Card>

        <View className="gap-3">
          <PrimaryButton label="Iniciar seguimiento" loading={busy} onPress={() => void run('start')} />
          <PrimaryButton label="Detener seguimiento" variant="secondary" loading={busy} onPress={() => void run('stop')} />
          <PrimaryButton label="Actualizar lectura" variant="secondary" loading={busy} onPress={() => void run('refresh')} />
        </View>
      </View>
    </Screen>
  );
}
