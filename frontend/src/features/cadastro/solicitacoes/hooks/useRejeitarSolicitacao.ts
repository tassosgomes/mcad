import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rejeitarSolicitacao } from '../api/solicitacoesApi';
import type { RejeitarSolicitacaoRequest } from '../types/solicitacao';

export function useRejeitarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & RejeitarSolicitacaoRequest) =>
      rejeitarSolicitacao(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    },
  });
}
