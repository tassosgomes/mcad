import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listarVerbasAgregadas } from '../api/verbasApi';
import type { VerbasAgregadoFilter } from '../types/verba';

export function useVerbasAgregado(filtros: VerbasAgregadoFilter) {
  return useQuery({
    queryKey: ['verbas', 'agregado', filtros],
    queryFn: () => listarVerbasAgregadas(filtros),
    placeholderData: keepPreviousData,
  });
}
