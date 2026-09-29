import { trackingUploadService } from '@/features/tracking/tracking-upload-service';
import { stopTrackingAndClearLocation } from '@/features/tracking';
import { syncService } from '@/lib/sync';

/**
 * Protocolo de apagado completo de servicios nativos en segundo plano (ST-34.2).
 *
 * Detiene en orden determinista:
 * 1. TrackingUploadService (NetInfo + AppState + timer de 60s)
 * 2. Foreground Service GPS (expo-location + TaskManager + buffers de telemetría)
 * 3. SyncService FIFO (NetInfo + retry timeout + periodic interval + reseteo de estado en memoria)
 *
 * Emplea Promise.allSettled para garantizar que la eventual falla o rechazo
 * de un servicio asíncrono no impida la detención de los demás.
 */
export async function teardownBackgroundServices(): Promise<void> {
  // 1. Detener listeners y timer del uploader de telemetría de forma inmediata
  trackingUploadService.stop();

  // 2. Detener GPS foreground service + limpiar buffers de telemetría
  // y detener sincronizador FIFO (sus timers, listeners NetInfo y estado en memoria)
  await Promise.allSettled([
    stopTrackingAndClearLocation(),
    syncService.stopSyncService(),
  ]);
}
