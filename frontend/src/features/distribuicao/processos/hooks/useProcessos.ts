import { useQuery } from '@tanstack/react-query';
import { listarProcessos } from '../api/processosApi';
import type { ProcessoFiltros } from '../types/processo';

export function useProcessos(filtros: ProcessoFiltros) {
  return useQuery({
    queryKey: ['distribuicao', 'processos', filtros],
    queryFn: () => listarProcessos(filtros),
    placeholderData: (previousData) => previousData,
  });
}
