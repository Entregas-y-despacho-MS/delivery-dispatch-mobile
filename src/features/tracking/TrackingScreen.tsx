import { useCallback, useEffect, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, View } from 'react-native';
import { AppText, Card, PrimaryButton, Screen, TextField } from '@/components/ui';
import {
  getLatestLocation, getTrackingBufferStats, getTrackingDiagnostics, getTrackingDispatchId,
  isTracking, reconcileTracking, setTrackingDispatchId, syncDispatchTracking, type TrackingPoint,
} from '@/features/tracking';
import { trackingUploadService } from './tracking-upload-service';
import type { TrackingBufferStats, TrackingDiagnostics } from './location-buffer.repository';

interface TrackingScreenProps {
  dispatchId?: number;
  allowManualDispatchId?: boolean;
}

const EMPTY_DIAGNOSTICS: TrackingDiagnostics = {
  lastBufferedAt: null,
  lastPointCapturedAt: null,
  lastUploadAttemptAt: null,
  lastUploadStatus: null,
  lastUploadCount: 0,
  lastAcknowledgedCount: 0,
  lastFailedCount: 0,
};

const UPLOAD_STATUS_LABELS = {
  started: 'Sin respuesta registrada',
  sent: 'Confirmado',
  partial: 'Confirmación parcial',
  error: 'Sin confirmar; se reintentará',
};

export default function TrackingScreen({ dispatchId, allowManualDispatchId = false }: TrackingScreenProps) {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [point, setPoint] = useState<TrackingPoint | null>(null);
  const [buffer, setBuffer] = useState<TrackingBufferStats>({ total: 0, pending: 0, failed: 0, diagnostic: 0 });
  const [diagnostics, setDiagnostics] = useState<TrackingDiagnostics>(EMPTY_DIAGNOSTICS);
  const [manualId, setManualId] = useState('');
  const [idError, setIdError] = useState<string>();
  const [boundId, setBoundId] = useState<number | null>(null);
  const [message, setMessage] = useState('Consulta el estado o inicia el seguimiento.');

  const refresh = useCallback(async () => {
    const [isActive, latest, stats, currentId, activity] = await Promise.all([
      isTracking(), getLatestLocation(), getTrackingBufferStats(), getTrackingDispatchId(), getTrackingDiagnostics(),
    ]);
    setActive(isActive);
    setPoint(latest);
    setBuffer(stats);
    setBoundId(currentId);
    setDiagnostics(activity);
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(() => {
      void Promise.all([refresh(), getTrackingDispatchId()]).then(([, currentId]) => {
        if (allowManualDispatchId && currentId !== null) setManualId(String(currentId));
      }).catch((error) => setMessage(String(error)));
    }, 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch((error) => setMessage(String(error)));
    });
    return () => {
      clearTimeout(initialRefresh);
      subscription.remove();
    };
  }, [allowManualDispatchId, refresh]);

  async function run(action: 'start' | 'stop' | 'refresh' | 'sync') {
    if (busy) return;
    setBusy(true);
    try {
      if (action === 'start') {
        let selectedId = dispatchId ?? null;
        if (allowManualDispatchId && manualId.trim()) {
          const value = manualId.trim();
          selectedId = Number(value);
          if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(selectedId)) {
            setIdError('Ingresa un ID de despacho entero y positivo.');
            return;
          }
        }
        setIdError(undefined);
        let result;
        if (selectedId === null) {
          await setTrackingDispatchId(null);
          result = await reconcileTracking(1);
        } else {
          result = await syncDispatchTracking(selectedId);
        }
        setMessage(result.status === 'tracking'
          ? selectedId === null
            ? 'Prueba local activa. Estos puntos no se envían al servidor.'
            : `Seguimiento activo para el despacho ${selectedId}. Los puntos se enviarán al recuperar la conexión.`
          : `No se inició: ${result.status}. Revisa los permisos en Ajustes.`);
      } else if (action === 'stop') {
        await syncDispatchTracking(null);
        setMessage('Seguimiento detenido. La última lectura se conserva para comparar.');
      } else if (action === 'sync') {
        const result = await trackingUploadService.flush();
        setMessage(result === null
          ? 'Sin conexión o sesión. Los puntos pendientes siguen guardados.'
          : `Enviados: ${result.acknowledged}. Rechazados: ${result.failed}.`);
      }
      await refresh();
    } catch (error) {
      setMessage(`Error: ${String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View className="gap-5">
        <View className="gap-2">
          <AppText variant="caption">{dispatchId ? `Despacho ${dispatchId}` : 'Solo desarrollo · ST-77.2'}</AppText>
          <AppText variant="title">{dispatchId ? 'Seguimiento GPS' : 'Prueba GPS'}</AppText>
          <AppText>{dispatchId
            ? 'Activa el seguimiento durante la ruta. Al finalizar este despacho, detén el servicio.'
            : 'Verifica la ubicación en segundo plano. Sin un ID real, los puntos quedan solo en este dispositivo.'}</AppText>
        </View>

        {allowManualDispatchId ? <Card className="gap-3">
          <AppText variant="heading">Asociar despacho</AppText>
          <TextField label="ID de despacho" value={manualId} keyboardType="numeric"
            placeholder="Vacío para prueba local" error={idError}
            onChangeText={(value) => { setManualId(value); setIdError(undefined); }} />
          <AppText variant="caption">Usa únicamente un ID real asignado a tu cuenta. Se asociará al iniciar el seguimiento.</AppText>
        </Card> : null}

        <Card className="gap-3">
          <AppText variant="heading">Estado del servicio</AppText>
          <AppText>{active ? 'Activo' : 'Detenido'}</AppText>
          {active && boundId !== null ? <AppText>Despacho asociado: {boundId}</AppText> : null}
          <AppText accessibilityLiveRegion="polite">{message}</AppText>
        </Card>

        <Card className="gap-2">
          <AppText variant="heading">Puntos guardados en este dispositivo</AppText>
          <AppText>{buffer.total} de 100</AppText>
          <AppText>Pendientes de envío: {buffer.pending}</AppText>
          {buffer.failed > 0 ? <AppText>Rechazados por el servidor: {buffer.failed}</AppText> : null}
          {buffer.diagnostic > 0 ? <AppText>Solo prueba local: {buffer.diagnostic}</AppText> : null}
        </Card>

        <Card className="gap-2">
          <AppText variant="heading">Actividad GPS en este dispositivo</AppText>
          {diagnostics.lastBufferedAt !== null ? <>
            <AppText>Último punto guardado: {new Date(diagnostics.lastBufferedAt).toLocaleString()}</AppText>
            {diagnostics.lastPointCapturedAt !== null ?
              <AppText variant="caption">Capturado: {new Date(diagnostics.lastPointCapturedAt).toLocaleString()}</AppText> : null}
          </> : <AppText>Aún no se guardó ningún punto.</AppText>}
          {diagnostics.lastUploadAttemptAt !== null ? <>
            <AppText>Último intento de envío: {new Date(diagnostics.lastUploadAttemptAt).toLocaleString()}</AppText>
            <AppText>{diagnostics.lastUploadStatus
              ? UPLOAD_STATUS_LABELS[diagnostics.lastUploadStatus] : 'Sin respuesta registrada'}
              {' · '}{diagnostics.lastAcknowledgedCount} confirmados de {diagnostics.lastUploadCount}
              {diagnostics.lastFailedCount > 0 ? ` · ${diagnostics.lastFailedCount} rechazados` : ''}
            </AppText>
          </> : <AppText>Aún no hubo un intento de envío.</AppText>}
          <AppText variant="caption">Pulsa Actualizar lectura para consultar la actividad más reciente.</AppText>
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
          {(dispatchId || allowManualDispatchId) ?
            <PrimaryButton label="Enviar puntos pendientes" variant="secondary" loading={busy} onPress={() => void run('sync')} /> : null}
        </View>
      </View>
    </Screen>
    </KeyboardAvoidingView>
  );
}
