import { useQuery } from '@tanstack/react-query';
import { listarDisponiveis } from '../api/processosApi';

export function useDisponiveis() {
  return useQuery({
    queryKey: ['distribuicao', 'processos', 'disponiveis'],
    queryFn: listarDisponiveis,
  });
}
