import { useQuery } from '@tanstack/react-query';
import { bffGet } from '@services/apiBffClient';

export type AuditEventType = 'SCREEN_ACCESS' | 'USER_ACTION' | 'DATA_CHANGE';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  occurredAt: string;
  subject: {
    id: string;
    name?: string;
    email?: string;
  };
  entityType: string;
  entityId: string;
  action?: string;
  payload?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  correlationId?: string;
}

export interface AuditTimeline {
  events: AuditEvent[];
  page: number;
  size: number;
  total: number;
}

export function useHistoricoProcesso(processoId: string) {
  return useQuery({
    queryKey: ['distribuicao', 'processo', processoId, 'historico'],
    queryFn: () =>
      bffGet<AuditTimeline>(`/distribuicao/processos/${encodeURIComponent(processoId)}/historico`),
    enabled: processoId.length > 0,
  });
}
