import { useQuery } from '@tanstack/react-query';
import { getAuditCatalog } from '../api/auditoriaApi';

export function useAuditCatalog() {
  return useQuery({
    queryKey: ['audit-catalog'],
    queryFn: getAuditCatalog,
  });
}
