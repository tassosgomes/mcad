import { useQuery } from '@tanstack/react-query';
import { getHistoricoFonograma } from '../api/fonogramasApi';

export function useHistoricoFonograma(id: string) {
  return useQuery({
    queryKey: ['historico-fonograma', id],
    queryFn: () => getHistoricoFonograma(id),
    enabled: !!id
  });
}
