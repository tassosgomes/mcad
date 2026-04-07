import { useQuery } from '@tanstack/react-query';
import { getPagamentos } from '../api/pagamentosApi';
import type { PagamentoFiltros } from '../types/pagamento';

export function usePagamentos(filtros: PagamentoFiltros) {
  return useQuery({ 
    queryKey: ['pagamentos', filtros], 
    queryFn: () => getPagamentos(filtros),
  });
}
