export { initDatabase, getDatabase, closeDatabase } from './connection';
export { SCHEMA_VERSION, runMigrations } from './schema';
export { getOrCreateEncryptionKey, encryptPayload, decryptPayload } from './crypto';
export { generateUUIDv7 } from './uuid';
export { localEventRepository, LocalEventRepository } from './repositories/local-event.repository';
export type {
  LocalEventType,
  SyncStatus,
  EvidenceType,
  StatusChangePayload,
  IncidentPayload,
  EvidencePayload,
  EventPayload,
  LocalEventRow,
  LocalEvent,
} from './types';
