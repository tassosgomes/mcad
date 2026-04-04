import { useQuery } from '@tanstack/react-query';
import { pendentesApi } from '../api/pendentesApi';
import type { ImpactoPendenteFilters } from '../types/pendente';

export function useImpactoPendentes(filters: ImpactoPendenteFilters) {
  return useQuery({
    queryKey: ['impactoPendentes', filters],
    queryFn: () => pendentesApi.getImpactoPendentes(filters),
    placeholderData: (previousData) => previousData,
  });
}
