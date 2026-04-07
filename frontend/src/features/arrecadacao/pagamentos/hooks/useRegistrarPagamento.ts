import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registrarPagamento } from '../api/pagamentosApi';

export function useRegistrarPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarPagamento,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pagamentos'] }); },
  });
}
