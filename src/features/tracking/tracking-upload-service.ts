import { AppState } from 'react-native';
import { getSessionStatus } from '@/features/auth/session';
import { isOnline, subscribeToNetworkChanges } from '@/lib/sync/network';
import { syncBufferedLocations, type TrackingUploadResult } from './location-upload';

const RETRY_INTERVAL_MS = 60_000;

class TrackingUploadService {
  private stopNetwork: (() => void) | null = null;
  private stopAppState: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.stopNetwork) return;
    this.stopNetwork = subscribeToNetworkChanges((online) => {
      if (online) this.flushInBackground();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') this.flushInBackground();
    });
    this.stopAppState = () => subscription.remove();
    this.timer = setInterval(() => this.flushInBackground(), RETRY_INTERVAL_MS);
    this.flushInBackground();
  }

  stop(): void {
    this.stopNetwork?.();
    this.stopNetwork = null;
    this.stopAppState?.();
    this.stopAppState = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** No se envía telemetría si no hay sesión o conexión; los puntos quedan en SQLite. */
  async flush(): Promise<TrackingUploadResult | null> {
    if (getSessionStatus() !== 'authenticated' || !await isOnline()) return null;
    return syncBufferedLocations();
  }

  private flushInBackground(): void {
    void this.flush().catch((error) => {
      console.warn('No se pudo enviar la telemetría; se reintentará:', error);
    });
  }
}

export const trackingUploadService = new TrackingUploadService();
