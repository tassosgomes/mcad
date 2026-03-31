import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adicionarTitularidade } from '../api/titularidadesApi';
import type { AdicionarTitularidadeRequest } from '../types/titularidade';

export function useAddTitularidade(obraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdicionarTitularidadeRequest) =>
      adicionarTitularidade(obraId, data),
    onSuccess: (response) => {
      // Update cache instantaneamente sem refetch adicional
      queryClient.setQueryData(['titularidades', obraId], response);
    },
  });
}
