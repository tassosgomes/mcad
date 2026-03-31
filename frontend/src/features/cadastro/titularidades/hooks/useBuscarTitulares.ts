import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@hooks/useDebounce';
import { buscarTitulares } from '../api/titularidadesApi';

export function useBuscarTitulares(query: string) {
  const debouncedQuery = useDebounce(query, 300);
  return useQuery({
    queryKey: ['titulares-busca', debouncedQuery],
    queryFn: () => buscarTitulares(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000, // 30s — autocomplete results podem ser reutilizados
  });
}
