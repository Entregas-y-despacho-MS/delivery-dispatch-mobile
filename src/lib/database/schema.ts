import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 4;

/**
 * Script DDL para la creación de la tabla local_events e índices de optimización.
 */
const CREATE_LOCAL_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS local_events (
  id           TEXT     PRIMARY KEY,
  dispatch_id  INTEGER  NOT NULL,
  event_type   TEXT     NOT NULL CHECK (event_type IN ('status_change', 'incident', 'evidence')),
  payload      TEXT     NOT NULL,
  created_at   TEXT     NOT NULL,
  sync_status  TEXT     NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  synced_at    TEXT,
  attempts     INTEGER  NOT NULL DEFAULT 0,
  last_error   TEXT
);

CREATE INDEX IF NOT EXISTS idx_local_events_sync_status ON local_events(sync_status);
CREATE INDEX IF NOT EXISTS idx_local_events_dispatch_id ON local_events(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_local_events_created_at  ON local_events(created_at);
`;

const CREATE_TRACKING_LATEST_LOCATION_TABLE = `
CREATE TABLE IF NOT EXISTS tracking_latest_location (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  captured_at INTEGER NOT NULL,
  payload     TEXT    NOT NULL
);
`;

const CREATE_TRACKING_TELEMETRY_TABLES = `
CREATE TABLE IF NOT EXISTS tracking_sampling_state (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  last_processed_at INTEGER,
  last_emitted_at   INTEGER,
  stationary_since  INTEGER
);

CREATE TABLE IF NOT EXISTS tracking_context (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  dispatch_id INTEGER CHECK (dispatch_id > 0),
  account     TEXT
);

CREATE TABLE IF NOT EXISTS tracking_location_buffer (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_id INTEGER CHECK (dispatch_id > 0),
  captured_at INTEGER NOT NULL,
  payload     TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed')),
  last_error  TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracking_buffer_pending
  ON tracking_location_buffer(status, dispatch_id, id);
`;

const CREATE_TRACKING_DIAGNOSTICS_TABLE = `
CREATE TABLE IF NOT EXISTS tracking_diagnostics (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  last_buffered_at       INTEGER,
  last_point_captured_at INTEGER,
  last_upload_attempt_at INTEGER,
  last_upload_status     TEXT CHECK (last_upload_status IN ('started', 'sent', 'partial', 'error')),
  last_upload_count      INTEGER NOT NULL DEFAULT 0,
  last_acknowledged_count INTEGER NOT NULL DEFAULT 0,
  last_failed_count      INTEGER NOT NULL DEFAULT 0
);
`;

/**
 * Ejecuta las migraciones de esquema en la base de datos SQLite según el user_version.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(CREATE_LOCAL_EVENTS_TABLE);
    await db.execAsync('PRAGMA user_version = 1;');
  }

  if (currentVersion < 2) {
    await db.execAsync(CREATE_TRACKING_LATEST_LOCATION_TABLE);
    await db.execAsync('PRAGMA user_version = 2;');
  }

  if (currentVersion < 3) {
    await db.execAsync(CREATE_TRACKING_TELEMETRY_TABLES);
    await db.execAsync('PRAGMA user_version = 3;');
  }

  if (currentVersion < 4) {
    await db.execAsync(CREATE_TRACKING_DIAGNOSTICS_TABLE);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  }
}
