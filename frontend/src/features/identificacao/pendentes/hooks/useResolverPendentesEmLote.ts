import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pendentesApi } from '../api/pendentesApi';
import type { ResolverLoteRequest } from '../types/pendente';

export function useResolverPendentesEmLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ResolverLoteRequest) => pendentesApi.resolverPendentesEmLote(data),
    onSuccess: () => {
      // Invalidation after batch processing
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['impactoPendentes'] });
      queryClient.invalidateQueries({ queryKey: ['execucoes'] });
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
