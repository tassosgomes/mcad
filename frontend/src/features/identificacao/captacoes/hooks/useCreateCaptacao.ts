import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarCaptacao } from '../api/captacoesApi';
import type { CriarCaptacaoRequest } from '../types/captacao';

export function useCreateCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarCaptacaoRequest) => criarCaptacao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
    },
  });
}
