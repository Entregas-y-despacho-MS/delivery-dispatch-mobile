export const LOCATION_TASK_NAME = 'delivery-dispatch.background-location';

// Umbrales iniciales; calibrar con recorridos reales antes de producción.
export const MIN_DISTANCE_METERS = 20;
export const MAX_ACCURACY_METERS = 30;
export const ANDROID_MIN_INTERVAL_MS = 10_000;

export const FAST_SPEED_METERS_PER_SECOND = 10 / 3.6;
export const STOPPED_SPEED_METERS_PER_SECOND = 3 / 3.6;
export const STOPPED_CONFIRMATION_MS = 3 * 60_000;
export const FAST_SAMPLE_INTERVAL_MS = 10_000;
export const SLOW_SAMPLE_INTERVAL_MS = 30_000;
export const STOPPED_SAMPLE_INTERVAL_MS = 60_000;
export const MAX_BUFFERED_LOCATIONS = 100;
