import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSolicitacoes } from '../api/solicitacoesApi';
import type { SolicitacaoFiltros } from '../types/solicitacao';

export function useSolicitacoes(filtros: SolicitacaoFiltros) {
  return useQuery({
    queryKey: ['solicitacoes', filtros],
    queryFn: () => getSolicitacoes(filtros),
    placeholderData: keepPreviousData,
  });
}
