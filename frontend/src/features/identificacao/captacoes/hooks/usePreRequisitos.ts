import { useQuery } from '@tanstack/react-query';
import { getPreRequisitos } from '../api/fechamentoApi';

export const usePreRequisitos = (captacaoId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['captacoes', captacaoId, 'pre-requisitos'],
    queryFn: () => getPreRequisitos(captacaoId),
    enabled: enabled && !!captacaoId,
    staleTime: 0, // Sempre atualizado porque conta dados precisos e cruciais
  });
};
