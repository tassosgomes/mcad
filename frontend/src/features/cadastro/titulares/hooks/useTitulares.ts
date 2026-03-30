import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getTitulares } from '../api/titularesApi';
import type { TitularFiltros } from '../types/titular';

export function useTitulares(filtros: TitularFiltros) {
  return useQuery({
    queryKey: ['titulares', filtros],
    queryFn: () => getTitulares(filtros),
    placeholderData: keepPreviousData,
  });
}
