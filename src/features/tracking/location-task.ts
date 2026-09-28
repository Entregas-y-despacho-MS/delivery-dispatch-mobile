import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { LOCATION_TASK_NAME } from './config';
import { toTrackingPoint } from './location-point';
import { saveLatestLocation } from './latest-location.repository';
import { bufferTrackingPoints, getTrackingDispatchId } from './location-buffer.repository';
import { trackingUploadService } from './tracking-upload-service';

interface LocationTaskData {
  locations: LocationObject[];
}

TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Error de ubicación en segundo plano:', error.message);
    return;
  }

  const points = data?.locations.map(toTrackingPoint).filter((point) => point !== null) ?? [];
  if (points.length === 0) return;

  const buffered = await bufferTrackingPoints(points);
  const newest = points.reduce((last, point) => point.capturedAt > last.capturedAt ? point : last);
  await saveLatestLocation(newest);
  if (buffered > 0 && await getTrackingDispatchId() !== null) {
    try {
      await trackingUploadService.flush();
    } catch (uploadError) {
      console.warn('Telemetría guardada para reintentar:', uploadError);
    }
  }
});
