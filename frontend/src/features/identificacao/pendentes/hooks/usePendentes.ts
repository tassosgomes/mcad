import { useQuery } from '@tanstack/react-query';
import { pendentesApi } from '../api/pendentesApi';
import type { PendenteListFilters } from '../types/pendente';

export function usePendentes(filters: PendenteListFilters) {
  return useQuery({
    queryKey: ['pendentes', filters],
    queryFn: () => pendentesApi.getPendentes(filters),
    placeholderData: (previousData) => previousData,
  });
}
