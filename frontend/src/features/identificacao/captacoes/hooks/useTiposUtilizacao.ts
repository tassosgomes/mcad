import { useQuery } from '@tanstack/react-query';
import { getTiposUtilizacao } from '../api/execucoesApi';
import { TipoUtilizacao } from '../types/execucao';

export function useTiposUtilizacao() {
  return useQuery<TipoUtilizacao[]>({
    queryKey: ['tiposUtilizacao'],
    queryFn: getTiposUtilizacao,
    staleTime: Infinity, // never stale, it's static domain data
  });
}
