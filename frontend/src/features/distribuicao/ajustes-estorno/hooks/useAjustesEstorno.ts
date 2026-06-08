import { useQuery } from '@tanstack/react-query';
import { ajustesEstornoApi } from '../api/ajustesEstornoApi';
import type { AjustesEstornoFiltros } from '../types/ajusteEstorno';

export const ajustesEstornoKeys = {
  all: ['distribuicao', 'ajustes-estorno'] as const,
  lists: () => [...ajustesEstornoKeys.all, 'list'] as const,
  list: (filtros: AjustesEstornoFiltros) => [...ajustesEstornoKeys.lists(), filtros] as const,
  details: () => [...ajustesEstornoKeys.all, 'detail'] as const,
  detail: (id: string) => [...ajustesEstornoKeys.details(), id] as const,
};

export function useAjustesEstorno(filtros: AjustesEstornoFiltros) {
  return useQuery({
    queryKey: ajustesEstornoKeys.list(filtros),
    queryFn: () => ajustesEstornoApi.listar(filtros),
  });
}
