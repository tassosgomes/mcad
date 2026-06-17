import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emitirBoletoPagamento } from '../api/pagamentosApi';

export function useEmitirBoletoPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: emitirBoletoPagamento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
    },
  });
}
