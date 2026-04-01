import { useQuery } from '@tanstack/react-query';
import { getFonogramas } from '../api/fonogramasApi';
import type { FonogramaFiltros } from '../types/fonograma';

export function useFonogramas(filtros: FonogramaFiltros) {
  return useQuery({
    queryKey: ['fonogramas', filtros],
    queryFn: () => getFonogramas(filtros),
  });
}
