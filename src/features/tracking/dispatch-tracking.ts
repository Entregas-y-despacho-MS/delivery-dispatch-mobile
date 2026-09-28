import { getTrackingDispatchId, setTrackingDispatchId } from './location-buffer.repository';
import { reconcileTracking, type TrackingResult } from './tracking-service';

let transition: Promise<unknown> = Promise.resolve();

/**
 * Punto de integración para el futuro módulo de despachos.
 * Pasa el ID de la ruta activa; pasa null cuando ya no queda un despacho por seguir.
 * Las transiciones se serializan para que una finalización no pise un inicio posterior.
 */
export function syncDispatchTracking(dispatchId: number | null): Promise<TrackingResult> {
  if (dispatchId !== null && (!Number.isSafeInteger(dispatchId) || dispatchId <= 0)) {
    return Promise.reject(new RangeError('dispatchId debe ser un entero positivo o null.'));
  }

  const next = transition.then(async () => {
    if (dispatchId === null) {
      const result = await reconcileTracking(0);
      await setTrackingDispatchId(null);
      return result;
    }

    const previousId = await getTrackingDispatchId();
    await setTrackingDispatchId(dispatchId);
    try {
      const result = await reconcileTracking(1);
      if (result.status !== 'tracking') await setTrackingDispatchId(previousId);
      return result;
    } catch (error) {
      await setTrackingDispatchId(previousId);
      throw error;
    }
  });
  transition = next.catch(() => undefined);
  return next;
}
