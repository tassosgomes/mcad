import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOcorrencias, criarOcorrencia } from '../api/ocorrenciasApi';
import type { OcorrenciaFiltros } from '../types/ocorrencia';

export function useOcorrencias(filtros: OcorrenciaFiltros = {}) {
  return useQuery({
    queryKey: ['portal', 'ocorrencias', filtros],
    queryFn: () => getOcorrencias(filtros),
  });
}

export function useCriarOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarOcorrencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'ocorrencias'] });
    },
  });
}
