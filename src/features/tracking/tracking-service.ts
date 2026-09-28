import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ANDROID_MIN_INTERVAL_MS, LOCATION_TASK_NAME, MIN_DISTANCE_METERS } from './config';
import { requestTrackingPermissions } from './permissions';
import { clearLatestLocation } from './latest-location.repository';
import { clearTrackingTelemetry } from './location-buffer.repository';
import type { TrackingPermissionResult } from './types';

export type TrackingResult = TrackingPermissionResult | { status: 'tracking' | 'stopped' };

let transition: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = transition.then(operation, operation);
  transition = next.catch(() => undefined);
  return next;
}

async function stopLocationTask(): Promise<void> {
  if (!await TaskManager.isAvailableAsync()) return;
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/** El módulo de despachos debe llamar a esta función al cambiar su lista activa. */
export function reconcileTracking(activeDispatchCount: number): Promise<TrackingResult> {
  if (!Number.isInteger(activeDispatchCount) || activeDispatchCount < 0) {
    return Promise.reject(new RangeError('activeDispatchCount debe ser un entero no negativo.'));
  }

  return serialize(async () => {
    if (activeDispatchCount === 0) {
      await stopLocationTask();
      return { status: 'stopped' };
    }
    if (!await TaskManager.isAvailableAsync()) {
      return { status: 'background-unavailable' };
    }
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)) {
      return { status: 'tracking' };
    }

    const permission = await requestTrackingPermissions();
    if (permission.status !== 'granted') return permission;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: MIN_DISTANCE_METERS,
      ...(Platform.OS === 'android' ? {
        timeInterval: ANDROID_MIN_INTERVAL_MS,
        foregroundService: {
          notificationTitle: 'Seguimiento de entregas activo',
          notificationBody: 'Flash Pack usa tu ubicación durante la ruta.',
          killServiceOnDestroy: true,
        },
      } : {
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      }),
    });
    return { status: 'tracking' };
  });
}

export function stopTracking(): Promise<void> {
  return serialize(stopLocationTask);
}

export async function isTracking(): Promise<boolean> {
  return await TaskManager.isAvailableAsync()
    && await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export function stopTrackingAndClearLocation(): Promise<void> {
  return serialize(async () => {
    await stopLocationTask();
    await clearLatestLocation();
    await clearTrackingTelemetry();
  });
}
