import { useQuery } from '@tanstack/react-query';
import { listarRubricas } from '../api/rubricasApi';

export function useRubricas() {
  return useQuery({
    queryKey: ['distribuicao', 'rubricas'],
    queryFn: listarRubricas,
  });
}
