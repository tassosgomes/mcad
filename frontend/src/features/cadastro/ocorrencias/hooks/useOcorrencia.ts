import { useQuery } from '@tanstack/react-query';
import { getOcorrenciaById } from '../api/ocorrenciasApi';

export function useOcorrencia(id: string) {
  return useQuery({
    queryKey: ['ocorrencias', id],
    queryFn: () => getOcorrenciaById(id),
    enabled: !!id,
  });
}
