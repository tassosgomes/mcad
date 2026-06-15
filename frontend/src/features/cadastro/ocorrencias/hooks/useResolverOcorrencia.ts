import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resolverOcorrencia } from '../api/ocorrenciasApi';
import type { ResolverOcorrenciaRequest } from '../types/ocorrencia';

export function useResolverOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ResolverOcorrenciaRequest) =>
      resolverOcorrencia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
  });
}
