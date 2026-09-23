import { useEffect, useState, useCallback } from 'react';
import { syncService, type SyncState } from '../sync-service';

/**
 * Hook de React para observar en tiempo real el estado de sincronización y conectividad de red.
 * Permite mostrar badges offline, indicadores de progreso de sincronización y botón de sincronizar ahora.
 */
export function useSyncStatus() {
  const [state, setState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  useEffect(() => {
    let isMounted = true;

    // Obtener estado inicial
    syncService.getSyncState().then((initialState) => {
      if (isMounted) {
        setState(initialState);
      }
    });

    // Suscribirse a actualizaciones
    const unsubscribe = syncService.subscribeToSyncState((updatedState) => {
      if (isMounted) {
        setState(updatedState);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    await syncService.triggerSync();
  }, []);

  return {
    ...state,
    syncNow,
  };
}
