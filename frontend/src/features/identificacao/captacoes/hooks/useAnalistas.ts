import { useQuery } from '@tanstack/react-query';
import { getAnalistas } from '../api/captacoesApi';

export function useAnalistas() {
  return useQuery({
    queryKey: ['analistas'],
    queryFn: getAnalistas,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });
}
