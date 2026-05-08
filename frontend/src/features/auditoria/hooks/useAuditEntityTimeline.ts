import { useQuery } from '@tanstack/react-query';
import { getAuditTimeline, type AuditTimelineParams } from '../api/auditoriaApi';

export function useAuditEntityTimeline(params: AuditTimelineParams, enabled = true) {
  return useQuery({
    queryKey: ['audit-timeline', params],
    queryFn: () => getAuditTimeline(params),
    enabled: enabled && Boolean(params.entityType) && Boolean(params.entityId),
  });
}
