import { useQuery } from '@tanstack/react-query';
import { buscarVerba } from '../api/verbasApi';

export function useVerba(rubricaSigla: string, periodo: string) {
  return useQuery({
    queryKey: ['verbas', rubricaSigla, periodo],
    queryFn: () => buscarVerba(rubricaSigla, periodo),
    enabled: !!rubricaSigla && !!periodo,
  });
}
