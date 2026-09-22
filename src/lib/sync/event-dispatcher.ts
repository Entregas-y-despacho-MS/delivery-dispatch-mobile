import { apiClient } from '@/lib/http/api-client';
import type {
  EvidencePayload,
  IncidentPayload,
  LocalEvent,
  StatusChangePayload,
} from '@/lib/database';

export interface DispatchResult {
  success: boolean;
  data?: unknown;
}

/**
 * Despachador HTTP responsable de mapear y enviar cada tipo de evento local
 * hacia el endpoint correspondiente del backend NestJS.
 */
export class EventDispatcher {
  /**
   * Despacha un evento local al backend según su tipo de evento.
   */
  async dispatch(event: LocalEvent): Promise<DispatchResult> {
    switch (event.eventType) {
      case 'status_change':
        return this.dispatchStatusChange(event as LocalEvent<StatusChangePayload>);

      case 'incident':
        return this.dispatchIncident(event as LocalEvent<IncidentPayload>);

      case 'evidence':
        return this.dispatchEvidence(event as LocalEvent<EvidencePayload>);

      default:
        throw new Error(`Tipo de evento no soportado: ${(event as LocalEvent).eventType}`);
    }
  }

  /**
   * Envía la actualización del estado del despacho (RF-U04).
   * Mapea al endpoint PATCH /dispatches/:id/status
   */
  private async dispatchStatusChange(
    event: LocalEvent<StatusChangePayload>
  ): Promise<DispatchResult> {
    const { dispatchId, payload } = event;
    const response = await apiClient.patch(`/dispatches/${dispatchId}/status`, {
      status: payload.new_status,
      detail: payload.detail,
    });

    return { success: true, data: response.data };
  }

  /**
   * Envía una incidencia registrada en ruta (RF-U06).
   * Mapea al endpoint POST /dispatches/:id/incidents
   */
  private async dispatchIncident(event: LocalEvent<IncidentPayload>): Promise<DispatchResult> {
    const { dispatchId, payload } = event;
    const response = await apiClient.post(`/dispatches/${dispatchId}/incidents`, {
      dispatch_incident_id: payload.incident_id, // UUID v7 generado en el móvil
      incident_reason_id: payload.incident_reason_id,
      description: payload.description,
    });

    return { success: true, data: response.data };
  }

  /**
   * Envía una evidencia digital de entrega o recojo (RF-U05, RF-U23).
   * Mapea al endpoint POST /dispatches/:id/evidences
   */
  private async dispatchEvidence(event: LocalEvent<EvidencePayload>): Promise<DispatchResult> {
    const { dispatchId, payload } = event;
    const response = await apiClient.post(`/dispatches/${dispatchId}/evidences`, {
      delivery_evidence_id: payload.evidence_id, // UUID v7 generado en el móvil
      type: payload.type,
      file_url: payload.local_file_uri,
      otp_code: payload.otp_code,
    });

    return { success: true, data: response.data };
  }
}

export const eventDispatcher = new EventDispatcher();
