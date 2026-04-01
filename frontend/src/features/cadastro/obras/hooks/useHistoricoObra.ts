import { useQuery } from '@tanstack/react-query';
import { getHistoricoObra } from '../api/obrasApi';

export function useHistoricoObra(id: string) {
  return useQuery({
    queryKey: ['historico-obra', id],
    queryFn: () => getHistoricoObra(id),
    enabled: !!id
  });
}
