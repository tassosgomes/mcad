import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fecharRol } from '../api/fechamentoApi';

export const useFecharRol = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (captacaoId: string) => fecharRol(captacaoId),
    onSuccess: (_, captacaoId) => {
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
      queryClient.invalidateQueries({ queryKey: ['captacao', captacaoId] });
      queryClient.invalidateQueries({ queryKey: ['execucoes'] });
      queryClient.invalidateQueries({ queryKey: ['pendentes'] });
    },
  });
};
