import { useQuery } from '@tanstack/react-query';
import { getFonogramasDaObra } from '../api/fonogramasApi';

export function useFonogramasDaObra(obraId: string | undefined) {
  return useQuery({
    queryKey: ['fonogramas-obra', obraId],
    queryFn: () => getFonogramasDaObra(obraId!),
    enabled: !!obraId,
  });
}
