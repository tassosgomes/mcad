import { useQuery } from '@tanstack/react-query';
import { getTitularidades } from '../api/titularidadesApi';

export function useTitularidades(obraId: string) {
  return useQuery({
    queryKey: ['titularidades', obraId],
    queryFn: () => getTitularidades(obraId),
    enabled: !!obraId,
  });
}
