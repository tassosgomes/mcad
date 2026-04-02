import { useQuery } from '@tanstack/react-query';
import { getCaptacaoById } from '../api/captacoesApi';

export function useCaptacao(id?: string) {
  return useQuery({
    queryKey: ['captacoes', id],
    queryFn: () => getCaptacaoById(id!),
    enabled: !!id,
  });
}
