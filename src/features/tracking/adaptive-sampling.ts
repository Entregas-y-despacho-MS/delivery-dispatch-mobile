import {
  FAST_SAMPLE_INTERVAL_MS,
  FAST_SPEED_METERS_PER_SECOND,
  SLOW_SAMPLE_INTERVAL_MS,
  STOPPED_CONFIRMATION_MS,
  STOPPED_SAMPLE_INTERVAL_MS,
  STOPPED_SPEED_METERS_PER_SECOND,
} from './config';
import type { TrackingPoint } from './types';

export interface SamplingState {
  lastProcessedAt: number | null;
  lastEmittedAt: number | null;
  stationarySince: number | null;
}

export const INITIAL_SAMPLING_STATE: SamplingState = {
  lastProcessedAt: null,
  lastEmittedAt: null,
  stationarySince: null,
};

export type SamplingMode = 'fast' | 'slow' | 'stopped';

export interface SamplingDecision {
  state: SamplingState;
  emit: boolean;
  mode: SamplingMode;
  intervalMs: number;
}

/** Los intervalos limitan la emisión de puntos; el sistema operativo decide cuándo entrega GPS. */
export function sampleTrackingPoint(point: TrackingPoint, state: SamplingState): SamplingDecision {
  if (state.lastProcessedAt !== null && point.capturedAt <= state.lastProcessedAt) {
    return { state, emit: false, mode: 'slow', intervalMs: SLOW_SAMPLE_INTERVAL_MS };
  }

  const speed = point.speedMetersPerSecond;
  const stationarySince = speed !== null && speed < STOPPED_SPEED_METERS_PER_SECOND
    ? state.stationarySince ?? point.capturedAt
    : null;

  let mode: SamplingMode = 'slow';
  let intervalMs = SLOW_SAMPLE_INTERVAL_MS;

  if (speed !== null && speed >= FAST_SPEED_METERS_PER_SECOND) {
    mode = 'fast';
    intervalMs = FAST_SAMPLE_INTERVAL_MS;
  } else if (stationarySince !== null
    && point.capturedAt - stationarySince >= STOPPED_CONFIRMATION_MS) {
    mode = 'stopped';
    intervalMs = STOPPED_SAMPLE_INTERVAL_MS;
  }

  const emit = state.lastEmittedAt === null
    || point.capturedAt - state.lastEmittedAt >= intervalMs;

  return {
    emit,
    mode,
    intervalMs,
    state: {
      lastProcessedAt: point.capturedAt,
      lastEmittedAt: emit ? point.capturedAt : state.lastEmittedAt,
      stationarySince,
    },
  };
}
