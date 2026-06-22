import { useQuery } from '@tanstack/react-query';
import { podeCancelarRol } from '../api/cancelamentoApi';
import type { StatusCaptacao } from '../types/captacao';

export function usePodeCancelar(captacaoId: string, status?: StatusCaptacao) {
  return useQuery({
    queryKey: ['captacoes', captacaoId, 'pode-cancelar'],
    queryFn: () => podeCancelarRol(captacaoId),
    enabled: !!captacaoId && status?.toUpperCase() === 'FECHADA',
    staleTime: 0, 
  });
}
