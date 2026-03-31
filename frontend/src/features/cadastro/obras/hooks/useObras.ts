import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getObras } from '../api/obrasApi';
import type { ObraFiltros } from '../types/obra';

export function useObras(filtros: ObraFiltros) {
  return useQuery({
    queryKey: ['obras', filtros],
    queryFn: () => getObras(filtros),
    placeholderData: keepPreviousData,
  });
}
