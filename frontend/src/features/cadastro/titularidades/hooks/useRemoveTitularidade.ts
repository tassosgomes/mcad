import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removerTitularidade } from '../api/titularidadesApi';

export function useRemoveTitularidade(obraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removerTitularidade(obraId, id),
    onSuccess: (response) => {
      queryClient.setQueryData(['titularidades', obraId], response);
    },
  });
}
