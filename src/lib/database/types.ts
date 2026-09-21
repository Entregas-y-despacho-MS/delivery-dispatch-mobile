/**
 * Tipos y contratos para la base de datos local SQLite de eventos fuera de línea.
 * Alineados con el esquema central de PostgreSQL (dispatch_events, dispatch_incidents, delivery_evidences).
 */

export type LocalEventType = 'status_change' | 'incident' | 'evidence';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export type EvidenceType = 'photo' | 'signature' | 'otp';

export interface StatusChangePayload {
  new_status: 'pending' | 'in_transit' | 'delivered' | 'not_delivered' | 'returned';
  detail?: string | null;
}

export interface IncidentPayload {
  incident_id: string; // UUID v7 generado en el móvil
  incident_reason_id: number;
  description?: string | null;
}

export interface EvidencePayload {
  evidence_id: string; // UUID v7 generado en el móvil
  type: EvidenceType;
  local_file_uri?: string | null;
  otp_code?: string | null;
}

export type EventPayload = StatusChangePayload | IncidentPayload | EvidencePayload;

/**
 * Fila en la tabla local_events de SQLite
 */
export interface LocalEventRow {
  id: string;
  dispatch_id: number;
  event_type: LocalEventType;
  payload: string; // JSON cifrado (AES-256-CBC base64)
  created_at: string; // ISO 8601
  sync_status: SyncStatus;
  synced_at: string | null;
  attempts: number;
  last_error: string | null;
}

/**
 * Objeto de evento local con payload ya descifrado
 */
export interface LocalEvent<TPayload extends EventPayload = EventPayload> {
  id: string;
  dispatchId: number;
  eventType: LocalEventType;
  payload: TPayload;
  createdAt: string;
  syncStatus: SyncStatus;
  syncedAt: string | null;
  attempts: number;
  lastError: string | null;
}
