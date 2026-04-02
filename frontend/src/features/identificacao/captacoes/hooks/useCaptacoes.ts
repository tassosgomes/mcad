import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCaptacoes } from '../api/captacoesApi';
import type { CaptacaoFiltros } from '../types/captacao';

export function useCaptacoes(filtros: CaptacaoFiltros) {
  return useQuery({
    queryKey: ['captacoes', filtros],
    queryFn: () => getCaptacoes(filtros),
    placeholderData: keepPreviousData,
  });
}
