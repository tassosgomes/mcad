import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirExecucao } from '../api/execucoesApi';

export function useDeleteExecucao(captacaoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => excluirExecucao(captacaoId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
    },
  });
}
