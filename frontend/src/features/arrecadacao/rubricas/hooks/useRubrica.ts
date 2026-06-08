import { useQuery } from '@tanstack/react-query';
import { buscarRubrica } from '../api/rubricasApi';

export function useRubrica(id?: string) {
  return useQuery({
    queryKey: ['rubricas', id],
    queryFn: () => buscarRubrica(id!),
    enabled: !!id,
  });
}
