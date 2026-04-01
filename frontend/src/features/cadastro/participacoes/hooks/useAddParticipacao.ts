import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adicionarParticipacao } from '../api/participacoesApi';
import type { AdicionarParticipacaoRequest } from '../types/participacao';

export function useAddParticipacao(fonogramaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdicionarParticipacaoRequest) =>
      adicionarParticipacao(fonogramaId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['participacoes', fonogramaId], response);
    },
  });
}
