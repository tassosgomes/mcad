import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarExecucao } from '../api/execucoesApi';
import { CriarExecucaoRequest } from '../types/execucao';

export function useCreateExecucao(captacaoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CriarExecucaoRequest) => criarExecucao(captacaoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
    },
  });
}
