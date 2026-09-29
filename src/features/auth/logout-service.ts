import { localEventRepository } from '@/lib/database';
import { syncService } from '@/lib/sync';
import { stopTrackingAndClearLocation } from '@/features/tracking';
import { signOut } from './auth-service';

export interface PendingSyncInfo {
  pendingCount: number;
  failedCount: number;
  total: number;
}

/**
 * Consulta cuántos eventos locales aún no se han sincronizado (RF-U08 Escenario 3).
 */
export async function getPendingSyncInfo(): Promise<PendingSyncInfo> {
  const [pending, failed] = await Promise.all([
    localEventRepository.getPendingEvents(),
    localEventRepository.getFailedEvents(),
  ]);
  return {
    pendingCount: pending.length,
    failedCount: failed.length,
    total: pending.length + failed.length,
  };
}

/**
 * Ejecuta el cierre de turno completo:
 * 1. Invoca signOut() (POST /auth/logout con timeout 3s y purga de SecureStore).
 * 2. Detiene el Foreground Service GPS y limpia telemetría en memoria (Escenario 2).
 * 3. Detiene el servicio de sincronización en segundo plano.
 */
export async function executeLogout(): Promise<void> {
  await signOut();
  await Promise.allSettled([
    stopTrackingAndClearLocation(),
    syncService.stopSyncService(),
  ]);
}
