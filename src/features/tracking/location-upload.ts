import { apiClient } from '@/lib/http/api-client';
import {
  acknowledgeBufferedLocations,
  getPendingBufferedLocations,
  markBufferedLocationFailed,
  recordTrackingUploadAttempt,
  recordTrackingUploadResult,
  type BufferedTrackingLocation,
} from './location-buffer.repository';

interface LocationReportResult {
  dispatchId: number;
  outcome: 'applied' | 'stale' | 'failed';
  error?: string;
}

interface LocationsReportResponse {
  results: LocationReportResult[];
}

export interface TrackingUploadResult {
  sent: number;
  acknowledged: number;
  failed: number;
}

let inFlight: Promise<TrackingUploadResult> | null = null;

/** Preparado para el módulo de despachos: sin un ID real la consulta devuelve cero puntos. */
export function syncBufferedLocations(): Promise<TrackingUploadResult> {
  if (inFlight) return inFlight;
  inFlight = uploadPendingLocations().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function uploadPendingLocations(): Promise<TrackingUploadResult> {
  const pending = await getPendingBufferedLocations();
  if (pending.length === 0) return { sent: 0, acknowledged: 0, failed: 0 };

  await updateDiagnostics(() => recordTrackingUploadAttempt(pending.length));
  try {
    const response = await apiClient.post<LocationsReportResponse>('/tracking/locations', {
      locations: pending.map(toReportLocation),
    });
    const results = response.data?.results;
    if (!Array.isArray(results) || results.length !== pending.length
      || results.some((result, index) => result.dispatchId !== pending[index].dispatchId
        || !['applied', 'stale', 'failed'].includes(result.outcome))) {
      throw new Error('Respuesta de tracking inválida; se conservó el buffer para reintentar.');
    }

    const acknowledged: number[] = [];
    let failed = 0;
    for (const [index, result] of results.entries()) {
      const row = pending[index];
      if (result.outcome === 'failed') {
        await markBufferedLocationFailed(row.id, result.error ?? 'Punto rechazado por el backend.');
        failed++;
      } else {
        acknowledged.push(row.id);
      }
    }
    await acknowledgeBufferedLocations(acknowledged);

    await updateDiagnostics(() => recordTrackingUploadResult(
      failed > 0 ? 'partial' : 'sent', acknowledged.length, failed
    ));
    return { sent: pending.length, acknowledged: acknowledged.length, failed };
  } catch (error) {
    await updateDiagnostics(() => recordTrackingUploadResult('error', 0, 0));
    throw error;
  }
}

async function updateDiagnostics(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    console.warn('No se pudo guardar el diagnóstico GPS:', error);
  }
}

function toReportLocation({ dispatchId, point }: BufferedTrackingLocation) {
  return {
    dispatchId,
    latitude: point.latitude,
    longitude: point.longitude,
    recordedAt: new Date(point.capturedAt).toISOString(),
  };
}
