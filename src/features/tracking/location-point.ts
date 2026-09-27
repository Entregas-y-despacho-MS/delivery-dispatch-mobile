import type { LocationObject } from 'expo-location';
import { MAX_ACCURACY_METERS } from './config';
import type { TrackingPoint } from './types';

export function toTrackingPoint(location: LocationObject): TrackingPoint | null {
  const { latitude, longitude, accuracy, speed } = location.coords;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || accuracy === null || !Number.isFinite(accuracy)
    || accuracy < 0 || accuracy > MAX_ACCURACY_METERS
    || !Number.isFinite(location.timestamp) || location.timestamp <= 0) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracyMeters: accuracy,
    speedMetersPerSecond: speed !== null && Number.isFinite(speed) && speed >= 0 ? speed : null,
    capturedAt: location.timestamp,
  };
}
