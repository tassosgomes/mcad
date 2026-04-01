import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removerParticipacao } from '../api/participacoesApi';

export function useRemoveParticipacao(fonogramaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participacaoId: string) =>
      removerParticipacao(fonogramaId, participacaoId),
    onSuccess: (response) => {
      queryClient.setQueryData(['participacoes', fonogramaId], response);
    },
  });
}
