import { decryptPayload, encryptPayload, getDatabase, initDatabase } from '@/lib/database';
import { INITIAL_SAMPLING_STATE, sampleTrackingPoint, type SamplingState } from './adaptive-sampling';
import { MAX_BUFFERED_LOCATIONS } from './config';
import type { TrackingPoint } from './types';

interface SamplingStateRow {
  last_processed_at: number | null;
  last_emitted_at: number | null;
  stationary_since: number | null;
}

interface BufferedLocationRow {
  id: number;
  dispatch_id: number;
  payload: string;
}

export interface BufferedTrackingLocation {
  id: number;
  dispatchId: number;
  point: TrackingPoint;
}

export interface TrackingBufferStats {
  total: number;
  pending: number;
  failed: number;
  diagnostic: number;
}

export type TrackingUploadStatus = 'started' | 'sent' | 'partial' | 'error';

export interface TrackingDiagnostics {
  lastBufferedAt: number | null;
  lastPointCapturedAt: number | null;
  lastUploadAttemptAt: number | null;
  lastUploadStatus: TrackingUploadStatus | null;
  lastUploadCount: number;
  lastAcknowledgedCount: number;
  lastFailedCount: number;
}

interface TrackingDiagnosticsRow {
  last_buffered_at: number | null;
  last_point_captured_at: number | null;
  last_upload_attempt_at: number | null;
  last_upload_status: TrackingUploadStatus | null;
  last_upload_count: number;
  last_acknowledged_count: number;
  last_failed_count: number;
}

/** Un ID real se asignará desde el futuro módulo de despachos; null mantiene la prueba local. */
export async function setTrackingDispatchId(dispatchId: number | null): Promise<void> {
  if (dispatchId !== null && (!Number.isSafeInteger(dispatchId) || dispatchId <= 0)) {
    throw new RangeError('dispatchId debe ser un entero positivo o null.');
  }

  await initDatabase();
  await getDatabase().withExclusiveTransactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<{ dispatch_id: number | null }>(
      'SELECT dispatch_id FROM tracking_context WHERE id = 1;'
    );
    if (current?.dispatch_id === dispatchId) return;

    await tx.runAsync(
      `INSERT INTO tracking_context (id, dispatch_id) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET dispatch_id = excluded.dispatch_id;`,
      [dispatchId]
    );
    // Los puntos de diagnóstico nunca se reasignan a un despacho real.
    if (dispatchId !== null) {
      await tx.runAsync('DELETE FROM tracking_location_buffer WHERE dispatch_id IS NULL;');
    }
    await tx.runAsync('DELETE FROM tracking_sampling_state;');
  });
}

export async function getTrackingDispatchId(): Promise<number | null> {
  await initDatabase();
  const row = await getDatabase().getFirstAsync<{ dispatch_id: number | null }>(
    'SELECT dispatch_id FROM tracking_context WHERE id = 1;'
  );
  return row?.dispatch_id ?? null;
}

/** Procesa cada lectura en orden y guarda en una sola transacción los puntos emitidos y el estado. */
export async function bufferTrackingPoints(points: TrackingPoint[]): Promise<number> {
  if (points.length === 0) return 0;
  await initDatabase();

  let bufferedCount = 0;
  await getDatabase().withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<SamplingStateRow>(
      'SELECT last_processed_at, last_emitted_at, stationary_since FROM tracking_sampling_state WHERE id = 1;'
    );
    const context = await tx.getFirstAsync<{ dispatch_id: number | null }>(
      'SELECT dispatch_id FROM tracking_context WHERE id = 1;'
    );

    let state: SamplingState = row ? {
      lastProcessedAt: row.last_processed_at,
      lastEmittedAt: row.last_emitted_at,
      stationarySince: row.stationary_since,
    } : INITIAL_SAMPLING_STATE;
    let lastPointCapturedAt: number | null = null;

    for (const point of [...points].sort((left, right) => left.capturedAt - right.capturedAt)) {
      const decision = sampleTrackingPoint(point, state);
      state = decision.state;
      if (!decision.emit) continue;

      const payload = await encryptPayload(point);
      await tx.runAsync(
        'INSERT INTO tracking_location_buffer (dispatch_id, captured_at, payload) VALUES (?, ?, ?);',
        [context?.dispatch_id ?? null, point.capturedAt, payload]
      );
      bufferedCount++;
      lastPointCapturedAt = point.capturedAt;
    }

    await tx.runAsync(
      `INSERT INTO tracking_sampling_state (id, last_processed_at, last_emitted_at, stationary_since)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         last_processed_at = excluded.last_processed_at,
         last_emitted_at = excluded.last_emitted_at,
         stationary_since = excluded.stationary_since;`,
      [state.lastProcessedAt, state.lastEmittedAt, state.stationarySince]
    );
    await tx.runAsync(
      `DELETE FROM tracking_location_buffer
       WHERE id NOT IN (
         SELECT id FROM tracking_location_buffer ORDER BY id DESC LIMIT ?
       );`,
      [MAX_BUFFERED_LOCATIONS]
    );
    if (lastPointCapturedAt !== null) {
      await tx.runAsync(
        `INSERT INTO tracking_diagnostics (id, last_buffered_at, last_point_captured_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           last_buffered_at = excluded.last_buffered_at,
           last_point_captured_at = excluded.last_point_captured_at;`,
        [Date.now(), lastPointCapturedAt]
      );
    }
  });

  return bufferedCount;
}

export async function getBufferedLocationCount(): Promise<number> {
  await initDatabase();
  const row = await getDatabase().getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM tracking_location_buffer;'
  );
  return row?.total ?? 0;
}

export async function getTrackingBufferStats(): Promise<TrackingBufferStats> {
  await initDatabase();
  const row = await getDatabase().getFirstAsync<TrackingBufferStats>(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN status = 'pending' AND dispatch_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS pending,
       COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
       COALESCE(SUM(CASE WHEN dispatch_id IS NULL THEN 1 ELSE 0 END), 0) AS diagnostic
     FROM tracking_location_buffer;`
  );
  return row ? { ...row } : { total: 0, pending: 0, failed: 0, diagnostic: 0 };
}

export async function getTrackingDiagnostics(): Promise<TrackingDiagnostics> {
  await initDatabase();
  const row = await getDatabase().getFirstAsync<TrackingDiagnosticsRow>(
    `SELECT last_buffered_at, last_point_captured_at, last_upload_attempt_at,
       last_upload_status, last_upload_count, last_acknowledged_count, last_failed_count
     FROM tracking_diagnostics WHERE id = 1;`
  );
  return {
    lastBufferedAt: row?.last_buffered_at ?? null,
    lastPointCapturedAt: row?.last_point_captured_at ?? null,
    lastUploadAttemptAt: row?.last_upload_attempt_at ?? null,
    lastUploadStatus: row?.last_upload_status ?? null,
    lastUploadCount: row?.last_upload_count ?? 0,
    lastAcknowledgedCount: row?.last_acknowledged_count ?? 0,
    lastFailedCount: row?.last_failed_count ?? 0,
  };
}

export async function recordTrackingUploadAttempt(count: number): Promise<void> {
  await initDatabase();
  await getDatabase().runAsync(
    `INSERT INTO tracking_diagnostics (id, last_upload_attempt_at, last_upload_status, last_upload_count)
     VALUES (1, ?, 'started', ?)
     ON CONFLICT(id) DO UPDATE SET
       last_upload_attempt_at = excluded.last_upload_attempt_at,
       last_upload_status = 'started',
       last_upload_count = excluded.last_upload_count,
       last_acknowledged_count = 0,
       last_failed_count = 0;`,
    [Date.now(), count]
  );
}

export async function recordTrackingUploadResult(
  status: Exclude<TrackingUploadStatus, 'started'>, acknowledged: number, failed: number
): Promise<void> {
  await initDatabase();
  await getDatabase().runAsync(
    `UPDATE tracking_diagnostics
     SET last_upload_status = ?, last_acknowledged_count = ?, last_failed_count = ?
     WHERE id = 1;`,
    [status, acknowledged, failed]
  );
}

/** Solo los puntos asociados a un despacho real se ofrecen para transmisión. */
export async function getPendingBufferedLocations(limit = MAX_BUFFERED_LOCATIONS): Promise<BufferedTrackingLocation[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BUFFERED_LOCATIONS) {
    throw new RangeError(`limit debe estar entre 1 y ${MAX_BUFFERED_LOCATIONS}.`);
  }
  await initDatabase();
  const rows = await getDatabase().getAllAsync<BufferedLocationRow>(
    `SELECT id, dispatch_id, payload FROM tracking_location_buffer
     WHERE status = 'pending' AND dispatch_id IS NOT NULL
     ORDER BY id ASC LIMIT ?;`,
    [limit]
  );
  return Promise.all(rows.map(async (row) => ({
    id: row.id,
    dispatchId: row.dispatch_id,
    point: await decryptPayload<TrackingPoint>(row.payload),
  })));
}

export async function acknowledgeBufferedLocations(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await initDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await getDatabase().runAsync(
    `DELETE FROM tracking_location_buffer WHERE id IN (${placeholders});`,
    ids
  );
}

export async function markBufferedLocationFailed(id: number, error: string): Promise<void> {
  await initDatabase();
  await getDatabase().runAsync(
    `UPDATE tracking_location_buffer SET status = 'failed', last_error = ? WHERE id = ?;`,
    [error, id]
  );
}

export async function clearTrackingTelemetry(): Promise<void> {
  await initDatabase();
  await getDatabase().withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM tracking_location_buffer;');
    await tx.runAsync('DELETE FROM tracking_sampling_state;');
    await tx.runAsync('DELETE FROM tracking_context;');
    await tx.runAsync('DELETE FROM tracking_diagnostics;');
  });
}
