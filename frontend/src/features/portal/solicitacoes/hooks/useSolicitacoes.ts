import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSolicitacoes, criarSolicitacao } from '../api/solicitacoesApi';

export function useSolicitacoes() {
  return useQuery({
    queryKey: ['portal', 'solicitacoes'],
    queryFn: getSolicitacoes,
  });
}

export function useCriarSolicitacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarSolicitacao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'solicitacoes'] });
    },
  });
}
