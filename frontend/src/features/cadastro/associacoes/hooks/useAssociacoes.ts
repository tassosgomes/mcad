import { useQuery } from '@tanstack/react-query';
import { getAssociacoes } from '../api/associacoesApi';

export function useAssociacoes() {
  return useQuery({
    queryKey: ['associacoes'],
    queryFn: getAssociacoes,
    staleTime: Infinity,
  });
}
