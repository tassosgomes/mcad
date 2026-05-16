import { useQuery } from '@tanstack/react-query';
import { buscarProcesso } from '../api/processosApi';

export function useProcesso(id: string) {
  return useQuery({
    queryKey: ['distribuicao', 'processos', id],
    queryFn: () => buscarProcesso(id),
    enabled: !!id,
  });
}
