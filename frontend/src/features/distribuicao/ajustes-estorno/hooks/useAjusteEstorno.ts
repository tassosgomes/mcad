import { useQuery } from '@tanstack/react-query';
import { ajustesEstornoApi } from '../api/ajustesEstornoApi';
import { ajustesEstornoKeys } from './useAjustesEstorno';

export function useAjusteEstorno(id: string | null) {
  return useQuery({
    queryKey: ajustesEstornoKeys.detail(id ?? ''),
    queryFn: () => ajustesEstornoApi.buscarPorId(id ?? ''),
    enabled: Boolean(id),
  });
}
