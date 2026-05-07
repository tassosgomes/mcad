import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { calcularProcesso, consultarCalculoProcesso } from '../api/processosCalculoApi';
import type { CalculoProcessoFilters } from '../types/calculo';

export const processoCalculoKeys = {
  all: ['distribuicao', 'processos', 'calculo'] as const,
  detail: (processoId: string) => [...processoCalculoKeys.all, processoId] as const,
  list: (processoId: string, filters: CalculoProcessoFilters) =>
    [...processoCalculoKeys.detail(processoId), filters] as const,
};

export function useProcessoCalculo(processoId: string | undefined, filters: CalculoProcessoFilters) {
  return useQuery({
    queryKey: processoCalculoKeys.list(processoId ?? '', filters),
    queryFn: () => consultarCalculoProcesso(processoId ?? '', filters),
    enabled: Boolean(processoId),
  });
}

export function useCalcularProcesso(processoId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => calcularProcesso(processoId ?? ''),
    onSuccess: async () => {
      if (processoId) {
        await queryClient.invalidateQueries({
          queryKey: processoCalculoKeys.detail(processoId),
        });
      }
    },
  });
}
