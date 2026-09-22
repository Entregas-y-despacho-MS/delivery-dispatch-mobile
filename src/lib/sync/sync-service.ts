import { localEventRepository } from '@/lib/database';
import { isOnline, subscribeToNetworkChanges } from './network';
import { eventDispatcher, EventDispatcher } from './event-dispatcher';
import { calculateBackoffDelay, extractErrorMessage, isRetryableError } from './backoff';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export type SyncStateListener = (state: SyncState) => void;

/**
 * Servicio de sincronización en segundo plano con cola FIFO estricta,
 * detector de conectividad NetInfo y política de reintentos con backoff exponencial.
 */
export class SyncService {
  private isSyncing = false;
  private isOnlineState = true;
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private periodicInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SyncStateListener> = new Set();
  private dispatcher: EventDispatcher;

  constructor(dispatcher: EventDispatcher = eventDispatcher) {
    this.dispatcher = dispatcher;
  }

  /**
   * Inicia el servicio de sincronización en segundo plano:
   * 1. Suscribe a cambios de red con NetInfo.
   * 2. Ejecuta un ciclo de sincronización inicial.
   * 3. Configura un intervalo periódico de sincronización de respaldo (cada 60s si está online).
   */
  async startSyncService(): Promise<void> {
    if (this.unsubscribeNetInfo) {
      return; // Ya iniciado
    }

    // 1. Estado inicial de red
    this.isOnlineState = await isOnline();
    this.notifyListeners();

    // 2. Escucha reactiva de transiciones online/offline
    this.unsubscribeNetInfo = subscribeToNetworkChanges((online) => {
      const wasOffline = !this.isOnlineState;
      this.isOnlineState = online;
      this.notifyListeners();

      // Si transitó de offline -> online, disparar sincronización inmediata de la cola
      if (wasOffline && online) {
        this.triggerSync();
      }
    });

    // 3. Sincronización inicial si hay conexión
    if (this.isOnlineState) {
      this.triggerSync();
    }

    // 4. Intervalo periódico de seguridad (cada 60s)
    this.periodicInterval = setInterval(() => {
      if (this.isOnlineState && !this.isSyncing) {
        this.processQueue();
      }
    }, 60000);
  }

  /**
   * Detiene el servicio y limpia todos los listeners y temporizadores.
   */
  stopSyncService(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }

    this.isSyncing = false;
    this.notifyListeners();
  }

  /**
   * Dispara una pasada de sincronización de la cola FIFO de forma asíncrona.
   */
  async triggerSync(): Promise<void> {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    return this.processQueue();
  }

  /**
   * Procesa la cola de eventos pendientes uno a uno en estricto orden FIFO,
   * respetando dependencias de estado por despacho y aplicando backoff exponencial.
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    // Verificar conectividad antes de intentar
    const online = await isOnline();
    this.isOnlineState = online;

    if (!online) {
      this.notifyListeners();
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // 1. Obtener eventos pendientes en orden FIFO (created_at ASC)
      const pendingEvents = await localEventRepository.getPendingEvents();

      if (pendingEvents.length === 0) {
        this.lastSyncAt = new Date();
        this.lastError = null;
        return;
      }

      // Conjunto para rastrear despachos cuyo evento previo falló
      // (para preservar el orden secuencial de estados en ese despacho).
      const blockedDispatches = new Set<number>();

      for (const event of pendingEvents) {
        // Si un evento anterior de este mismo despacho falló, no procesar posteriores
        if (blockedDispatches.has(event.dispatchId)) {
          continue;
        }

        try {
          // Despacho HTTP del evento
          await this.dispatcher.dispatch(event);

          // Éxito: marcar como sincronizado
          await localEventRepository.markAsSynced(event.id);
          this.lastError = null;
        } catch (error) {
          const errorMsg = extractErrorMessage(error);
          const retryable = isRetryableError(error);

          this.lastError = errorMsg;
          blockedDispatches.add(event.dispatchId);

          // Actualizar estado en base de datos local
          await localEventRepository.markAsFailed(event.id, errorMsg);

          // Si el fallo es de servidor (5xx) o pérdida de red, detener la cola y programar reintento
          if (retryable) {
            const delay = calculateBackoffDelay(event.attempts + 1);
            this.scheduleRetry(delay);
            break; // Interrumpir el lote actual para esperar el backoff
          }
        }
      }

      // 2. Purgar eventos antiguos ya sincronizados (> 7 días)
      await localEventRepository.purgeSyncedEvents(7);
      this.lastSyncAt = new Date();
    } catch (unexpectedError) {
      this.lastError = extractErrorMessage(unexpectedError);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Programa un reintento automático de la cola tras un delay de backoff exponencial.
   */
  private scheduleRetry(delayMs: number): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (this.isOnlineState && !this.isSyncing) {
        this.processQueue();
      }
    }, delayMs);
  }

  /**
   * Consulta el estado actual de sincronización para componentes UI.
   */
  async getSyncState(): Promise<SyncState> {
    const pendingEvents = await localEventRepository.getPendingEvents();
    const failedEvents = await localEventRepository.getFailedEvents();

    return {
      isOnline: this.isOnlineState,
      isSyncing: this.isSyncing,
      pendingCount: pendingEvents.length,
      failedCount: failedEvents.length,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }

  /**
   * Suscribe un listener a cambios del estado de sincronización.
   */
  subscribeToSyncState(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica a todos los componentes suscritos.
   */
  private async notifyListeners(): Promise<void> {
    if (this.listeners.size === 0) return;
    try {
      const state = await this.getSyncState();
      for (const listener of this.listeners) {
        listener(state);
      }
    } catch {
      // Ignorar errores en notificación
    }
  }
}

export const syncService = new SyncService();
