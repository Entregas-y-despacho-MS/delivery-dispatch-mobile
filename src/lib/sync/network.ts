import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkChangeListener = (isOnline: boolean) => void;

/**
 * Determina si el estado de NetInfo representa una conexión utilizable con acceso a internet.
 */
export function isStateOnline(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/**
 * Consulta de forma asíncrona el estado de conectividad de red actual.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return isStateOnline(state);
}

/**
 * Suscribe un callback a cambios de conectividad de red.
 * Notifica inmediatamente con el estado actual y ante cada transición online/offline.
 *
 * @returns Función de desuscripción para limpieza de recursos.
 */
export function subscribeToNetworkChanges(callback: NetworkChangeListener): () => void {
  let lastStatus: boolean | null = null;

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const currentStatus = isStateOnline(state);
    if (currentStatus !== lastStatus) {
      lastStatus = currentStatus;
      callback(currentStatus);
    }
  });

  return unsubscribe;
}

export const networkMonitor = {
  isOnline,
  subscribeToNetworkChanges,
  isStateOnline,
};
