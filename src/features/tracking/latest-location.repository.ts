import { getDatabase, initDatabase, encryptPayload, decryptPayload } from '@/lib/database';
import type { TrackingPoint } from './types';

export async function saveLatestLocation(point: TrackingPoint): Promise<void> {
  await initDatabase();
  const payload = await encryptPayload(point);
  await getDatabase().runAsync(
    `INSERT INTO tracking_latest_location (id, captured_at, payload)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET captured_at = excluded.captured_at, payload = excluded.payload
     WHERE excluded.captured_at > tracking_latest_location.captured_at;`,
    [point.capturedAt, payload]
  );
}

export async function getLatestLocation(): Promise<TrackingPoint | null> {
  await initDatabase();
  const row = await getDatabase().getFirstAsync<{ payload: string }>(
    'SELECT payload FROM tracking_latest_location WHERE id = 1;'
  );
  return row ? decryptPayload<TrackingPoint>(row.payload) : null;
}

export async function clearLatestLocation(): Promise<void> {
  await initDatabase();
  await getDatabase().runAsync('DELETE FROM tracking_latest_location WHERE id = 1;');
}
