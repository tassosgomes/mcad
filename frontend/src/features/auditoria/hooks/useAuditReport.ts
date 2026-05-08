import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createAuditReport,
  getAuditReport,
} from '../api/auditoriaApi';

export function useCreateAuditReport() {
  return useMutation({
    mutationFn: createAuditReport,
  });
}

export function useAuditReport(reportId: string | null) {
  return useQuery({
    queryKey: ['audit-report', reportId],
    queryFn: () => getAuditReport(reportId ?? ''),
    enabled: Boolean(reportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'RUNNING' ? 3000 : false;
    },
  });
}
