import { getDatabase } from '../connection';
import { encryptPayload, decryptPayload } from '../crypto';
import { generateUUIDv7 } from '../uuid';
import type {
  EventPayload,
  EvidencePayload,
  EvidenceType,
  IncidentPayload,
  LocalEvent,
  LocalEventRow,
  StatusChangePayload,
} from '../types';

/**
 * Repositorio transaccional para la persistencia local de eventos de entrega,
 * incidencias y evidencias fuera de línea (RF-U04, RF-U05, RF-U06, RF-U13).
 */
export class LocalEventRepository {
  /**
   * Mapea una fila de SQLite y descifra su payload asíncronamente a un objeto LocalEvent tipado.
   */
  private async mapRowToEvent<TPayload extends EventPayload = EventPayload>(
    row: LocalEventRow
  ): Promise<LocalEvent<TPayload>> {
    const decrypted = await decryptPayload<TPayload>(row.payload);
    return {
      id: row.id,
      dispatchId: row.dispatch_id,
      eventType: row.event_type,
      payload: decrypted,
      createdAt: row.created_at,
      syncStatus: row.sync_status,
      syncedAt: row.synced_at,
      attempts: row.attempts,
      lastError: row.last_error,
    };
  }

  /**
   * Inserta un evento de cambio de estado de entrega de forma transaccional (RF-U04).
   */
  async insertStatusChange(
    dispatchId: number,
    newStatus: StatusChangePayload['new_status'],
    detail?: string | null
  ): Promise<LocalEvent<StatusChangePayload>> {
    const db = getDatabase();
    const eventId = generateUUIDv7();
    const createdAt = new Date().toISOString();
    const payload: StatusChangePayload = {
      new_status: newStatus,
      detail: detail ?? null,
    };

    const encryptedPayload = await encryptPayload(payload);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO local_events (id, dispatch_id, event_type, payload, created_at, sync_status, attempts)
         VALUES (?, ?, 'status_change', ?, ?, 'pending', 0);`,
        [eventId, dispatchId, encryptedPayload, createdAt]
      );
    });

    return {
      id: eventId,
      dispatchId,
      eventType: 'status_change',
      payload,
      createdAt,
      syncStatus: 'pending',
      syncedAt: null,
      attempts: 0,
      lastError: null,
    };
  }

  /**
   * Inserta una incidencia en ruta de forma transaccional con UUID v7 generado en el móvil (RF-U06).
   * La clave `incident_id` generada se convertirá en la PK definitiva en PostgreSQL (`dispatch_incidents`).
   */
  async insertIncident(
    dispatchId: number,
    incidentReasonId: number,
    description?: string | null
  ): Promise<LocalEvent<IncidentPayload>> {
    const db = getDatabase();
    const eventId = generateUUIDv7();
    const incidentId = generateUUIDv7(); // PK definitiva para PostgreSQL
    const createdAt = new Date().toISOString();

    const payload: IncidentPayload = {
      incident_id: incidentId,
      incident_reason_id: incidentReasonId,
      description: description ?? null,
    };

    const encryptedPayload = await encryptPayload(payload);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO local_events (id, dispatch_id, event_type, payload, created_at, sync_status, attempts)
         VALUES (?, ?, 'incident', ?, ?, 'pending', 0);`,
        [eventId, dispatchId, encryptedPayload, createdAt]
      );
    });

    return {
      id: eventId,
      dispatchId,
      eventType: 'incident',
      payload,
      createdAt,
      syncStatus: 'pending',
      syncedAt: null,
      attempts: 0,
      lastError: null,
    };
  }

  /**
   * Inserta evidencia digital (foto, firma, OTP) con UUID v7 generado en el móvil (RF-U05, RF-U23).
   * La clave `evidence_id` generada se convertirá en la PK definitiva en PostgreSQL (`delivery_evidences`).
   */
  async insertEvidence(
    dispatchId: number,
    type: EvidenceType,
    localFileUri?: string | null,
    otpCode?: string | null
  ): Promise<LocalEvent<EvidencePayload>> {
    const db = getDatabase();
    const eventId = generateUUIDv7();
    const evidenceId = generateUUIDv7(); // PK definitiva para PostgreSQL
    const createdAt = new Date().toISOString();

    const payload: EvidencePayload = {
      evidence_id: evidenceId,
      type,
      local_file_uri: localFileUri ?? null,
      otp_code: otpCode ?? null,
    };

    const encryptedPayload = await encryptPayload(payload);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO local_events (id, dispatch_id, event_type, payload, created_at, sync_status, attempts)
         VALUES (?, ?, 'evidence', ?, ?, 'pending', 0);`,
        [eventId, dispatchId, encryptedPayload, createdAt]
      );
    });

    return {
      id: eventId,
      dispatchId,
      eventType: 'evidence',
      payload,
      createdAt,
      syncStatus: 'pending',
      syncedAt: null,
      attempts: 0,
      lastError: null,
    };
  }

  /**
   * Obtiene todos los eventos pendientes en orden estricto FIFO para el sincronizador (ST-79.2).
   */
  async getPendingEvents(): Promise<LocalEvent[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LocalEventRow>(
      `SELECT * FROM local_events
       WHERE sync_status = 'pending'
       ORDER BY created_at ASC;`
    );

    return Promise.all(rows.map((r) => this.mapRowToEvent(r)));
  }

  /**
   * Obtiene los eventos que han fallado para evaluación de reintentos.
   */
  async getFailedEvents(): Promise<LocalEvent[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LocalEventRow>(
      `SELECT * FROM local_events
       WHERE sync_status = 'failed'
       ORDER BY created_at ASC;`
    );

    return Promise.all(rows.map((r) => this.mapRowToEvent(r)));
  }

  /**
   * Obtiene el historial de eventos asociados a un despacho en el dispositivo local.
   */
  async getEventsByDispatch(dispatchId: number): Promise<LocalEvent[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<LocalEventRow>(
      `SELECT * FROM local_events
       WHERE dispatch_id = ?
       ORDER BY created_at ASC;`,
      [dispatchId]
    );

    return Promise.all(rows.map((r) => this.mapRowToEvent(r)));
  }

  /**
   * Marca un evento como sincronizado exitosamente con el backend.
   */
  async markAsSynced(id: string): Promise<void> {
    const db = getDatabase();
    const syncedAt = new Date().toISOString();
    await db.runAsync(
      `UPDATE local_events
       SET sync_status = 'synced', synced_at = ?, last_error = NULL
       WHERE id = ?;`,
      [syncedAt, id]
    );
  }

  /**
   * Registra un fallo de sincronización e incrementa el contador de reintentos.
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE local_events
       SET sync_status = 'failed', attempts = attempts + 1, last_error = ?
       WHERE id = ?;`,
      [errorMessage, id]
    );
  }

  /**
   * Restablece un evento fallido a estado pendiente para ser reintentado en la cola.
   */
  async resetForRetry(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE local_events
       SET sync_status = 'pending'
       WHERE id = ?;`,
      [id]
    );
  }

  /**
   * Elimina eventos ya sincronizados anteriores a una cantidad de días (por defecto 7 días).
   */
  async purgeSyncedEvents(olderThanDays = 7): Promise<number> {
    const db = getDatabase();
    const thresholdDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.runAsync(
      `DELETE FROM local_events
       WHERE sync_status = 'synced' AND synced_at < ?;`,
      [thresholdDate]
    );
    return result.changes;
  }
}

export const localEventRepository = new LocalEventRepository();
