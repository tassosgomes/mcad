import { useQuery } from '@tanstack/react-query';
import { getExecucoes } from '../api/execucoesApi';
import { FiltrosExecucao, ListarExecucoesResponse } from '../types/execucao';

export function useExecucoes(captacaoId: string, filtros: FiltrosExecucao) {
  return useQuery<ListarExecucoesResponse>({
    queryKey: ['execucoes', captacaoId, filtros],
    queryFn: () => getExecucoes(captacaoId, filtros),
    placeholderData: (previousData) => previousData, // keepPreviousData approach
    enabled: !!captacaoId,
  });
}
