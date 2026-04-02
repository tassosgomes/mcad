import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarCaptacao } from '../api/captacoesApi';
import type { AtualizarCaptacaoRequest } from '../types/captacao';

export function useUpdateCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarCaptacaoRequest }) =>
      atualizarCaptacao(id, data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(['captacoes', variables.id], result);
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
