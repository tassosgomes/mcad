import { useQuery } from '@tanstack/react-query';
import { getMinhasObras, getMeusFonogramas } from '../api/repertorioApi';
import type { RepertorioFiltros } from '../types/repertorio';

export function useMinhasObras(filtros: RepertorioFiltros) {
  return useQuery({
    queryKey: ['portal', 'minhas-obras', filtros],
    queryFn: () => getMinhasObras(filtros),
  });
}

export function useMeusFonogramas(filtros: RepertorioFiltros) {
  return useQuery({
    queryKey: ['portal', 'meus-fonogramas', filtros],
    queryFn: () => getMeusFonogramas(filtros),
  });
}
