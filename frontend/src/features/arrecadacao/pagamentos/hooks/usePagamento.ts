import { useQuery } from '@tanstack/react-query';
import { getPagamentoById } from '../api/pagamentosApi';

export function usePagamento(id: string) {
  return useQuery({
    queryKey: ['pagamentos', id],
    queryFn: () => getPagamentoById(id),
    enabled: !!id,
  });
}
