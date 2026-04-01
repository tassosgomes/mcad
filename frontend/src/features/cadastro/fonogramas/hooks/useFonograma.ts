import { useQuery } from '@tanstack/react-query';
import { getFonogramaById } from '../api/fonogramasApi';

export function useFonograma(id: string | undefined) {
  return useQuery({
    queryKey: ['fonogramas', id],
    queryFn: () => getFonogramaById(id!),
    enabled: !!id,
  });
}
