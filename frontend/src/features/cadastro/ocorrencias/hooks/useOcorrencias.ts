import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getOcorrencias } from '../api/ocorrenciasApi';
import type { OcorrenciaFiltros } from '../types/ocorrencia';

export function useOcorrencias(filtros: OcorrenciaFiltros) {
  return useQuery({
    queryKey: ['ocorrencias', filtros],
    queryFn: () => getOcorrencias(filtros),
    placeholderData: keepPreviousData,
  });
}
