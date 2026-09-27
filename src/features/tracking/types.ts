export interface TrackingPoint {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedMetersPerSecond: number | null;
  capturedAt: number;
}

export type TrackingPermissionResult =
  | { status: 'granted' }
  | { status: 'services-disabled' | 'precise-location-required' | 'background-unavailable' }
  | { status: 'foreground-denied' | 'background-denied'; canAskAgain: boolean };
