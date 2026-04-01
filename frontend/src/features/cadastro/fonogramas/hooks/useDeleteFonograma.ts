import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirFonograma } from '../api/fonogramasApi';

export function useDeleteFonograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => excluirFonograma(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas-obra'] });
    },
  });
}
