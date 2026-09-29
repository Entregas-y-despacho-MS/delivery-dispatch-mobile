import { useState, useCallback } from 'react';
import { getPendingSyncInfo, executeLogout, type PendingSyncInfo } from './logout-service';

export type LogoutPhase =
  | 'idle'
  | 'checking'
  | 'confirming'
  | 'warning'
  | 'logging-out'
  | 'error';

export function useLogout() {
  const [phase, setPhase] = useState<LogoutPhase>('idle');
  const [pendingInfo, setPendingInfo] = useState<PendingSyncInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Inicia el proceso de cierre de turno consultando eventos locales pendientes.
   */
  const requestLogout = useCallback(async () => {
    setPhase('checking');
    setError(null);
    try {
      const info = await getPendingSyncInfo();
      setPendingInfo(info);
      setPhase(info.total > 0 ? 'warning' : 'confirming');
    } catch {
      setPhase('confirming');
      setPendingInfo(null);
    }
  }, []);

  /**
   * Confirma la salida definitiva (forzada o normal).
   */
  const confirmLogout = useCallback(async () => {
    setPhase('logging-out');
    setError(null);
    try {
      await executeLogout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar sesión.');
      setPhase('error');
    }
  }, []);

  /**
   * Cancela el diálogo y restaura el estado inicial.
   */
  const cancelLogout = useCallback(() => {
    setPhase('idle');
    setError(null);
    setPendingInfo(null);
  }, []);

  return {
    phase,
    pendingInfo,
    error,
    requestLogout,
    confirmLogout,
    cancelLogout,
  };
}
