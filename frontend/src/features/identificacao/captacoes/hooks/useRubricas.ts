import { useQuery } from '@tanstack/react-query';
import { getRubricas } from '../api/captacoesApi';

export function useRubricas() {
  return useQuery({
    queryKey: ['rubricas'],
    queryFn: getRubricas,
    staleTime: Infinity,              // Nunca re-fetch automático — dados seed
    gcTime: 1000 * 60 * 60,          // Mantém em cache por 1h
    select: (data) => data.data,      // Extrai array diretamente
  });
}
