import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aprovarSolicitacao } from '../api/solicitacoesApi';

export function useAprovarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aprovarSolicitacao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes'] });
    },
  });
}
