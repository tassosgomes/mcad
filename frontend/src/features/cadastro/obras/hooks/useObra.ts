import { useQuery } from '@tanstack/react-query';
import { getObraById } from '../api/obrasApi';

export function useObra(id?: string) {
  return useQuery({
    queryKey: ['obras', id],
    queryFn: () => getObraById(id!),
    enabled: !!id,
  });
}
