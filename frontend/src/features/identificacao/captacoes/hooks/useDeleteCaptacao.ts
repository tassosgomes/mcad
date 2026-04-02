import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirCaptacao } from '../api/captacoesApi';

export function useDeleteCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => excluirCaptacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
