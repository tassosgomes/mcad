import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pendentesApi } from '../api/pendentesApi';
import type { ResolverPendenteRequest } from '../types/pendente';

export function useResolverPendente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolverPendenteRequest }) =>
      pendentesApi.resolverPendente(id, data),
    onSuccess: () => {
      // Invalidation after resolving execution
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['impactoPendentes'] });
      queryClient.invalidateQueries({ queryKey: ['execucoes'] });
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
