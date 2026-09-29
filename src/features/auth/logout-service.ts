import { localEventRepository } from '@/lib/database';
import { signOut } from './auth-service';
import { teardownBackgroundServices } from './service-teardown';

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
 * 2. Detiene todos los servicios nativos en segundo plano (Foreground Service GPS,
 *    TrackingUploadService y SyncService FIFO) mediante el protocolo de teardown ST-34.2.
 */
export async function executeLogout(): Promise<void> {
  await signOut();
  await teardownBackgroundServices();
}
