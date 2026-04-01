import { useQuery } from '@tanstack/react-query';
import { getParticipacoes } from '../api/participacoesApi';

export function useParticipacoes(fonogramaId: string) {
  return useQuery({
    queryKey: ['participacoes', fonogramaId],
    queryFn: () => getParticipacoes(fonogramaId),
    enabled: !!fonogramaId,
  });
}
