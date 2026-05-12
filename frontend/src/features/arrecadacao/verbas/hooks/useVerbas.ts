import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listarVerbas } from '../api/verbasApi';
import type { VerbasFilter } from '../types/verba';

export function useVerbas(filtros: VerbasFilter) {
  return useQuery({
    queryKey: ['verbas', filtros],
    queryFn: () => listarVerbas(filtros),
    placeholderData: keepPreviousData,
  });
}
