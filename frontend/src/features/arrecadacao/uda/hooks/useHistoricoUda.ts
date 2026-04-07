import { useQuery } from '@tanstack/react-query';
import { getHistoricoUda } from '../api/udaApi';

export function useHistoricoUda() {
  return useQuery({ queryKey: ['uda', 'historico'], queryFn: getHistoricoUda });
}
