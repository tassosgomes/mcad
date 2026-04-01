import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ajustarPercentual } from '../api/participacoesApi';
import type { AjustarPercentualRequest } from '../types/participacao';

export function useAjustarPercentual(fonogramaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participacaoId, data }: { participacaoId: string; data: AjustarPercentualRequest }) =>
      ajustarPercentual(fonogramaId, participacaoId, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['participacoes', fonogramaId], response);
    },
  });
}
