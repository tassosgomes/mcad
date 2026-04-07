import { useMutation, useQueryClient } from '@tanstack/react-query';
import { estornarPagamento } from '../api/pagamentosApi';
import type { EstornarPagamentoRequest } from '../types/pagamento';

export function useEstornarPagamento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstornarPagamentoRequest }) =>
      estornarPagamento(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos', id] });
    },
  });
}
