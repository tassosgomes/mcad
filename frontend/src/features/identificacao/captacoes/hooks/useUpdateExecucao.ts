import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarExecucao } from '../api/execucoesApi';
import { AtualizarExecucaoRequest } from '../types/execucao';

export function useUpdateExecucao(captacaoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarExecucaoRequest }) =>
      atualizarExecucao(captacaoId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
    },
  });
}
