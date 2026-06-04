import { useQuery } from '@tanstack/react-query';
import { getAuditEvents, type AuditEventsParams } from '../api/auditoriaApi';

export function useAuditEvents(params: AuditEventsParams, enabled = true) {
  const hasPeriod = Boolean(params.from) && Boolean(params.to);

  return useQuery({
    queryKey: ['audit-events', params],
    queryFn: () => getAuditEvents(params),
    enabled: enabled && hasPeriod,
  });
}
