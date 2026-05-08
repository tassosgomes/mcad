import { useQuery } from '@tanstack/react-query';
import { getAuditEvent } from '../api/auditoriaApi';

export function useAuditEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['audit-event', eventId],
    queryFn: () => getAuditEvent(eventId ?? ''),
    enabled: Boolean(eventId),
  });
}
