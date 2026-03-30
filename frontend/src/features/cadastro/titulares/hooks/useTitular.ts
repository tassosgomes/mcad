import { useQuery } from '@tanstack/react-query';
import { getTitularById } from '../api/titularesApi';

export function useTitular(id: string | undefined) {
  return useQuery({
    queryKey: ['titulares', id],
    queryFn: () => getTitularById(id!),
    enabled: !!id,
  });
}
