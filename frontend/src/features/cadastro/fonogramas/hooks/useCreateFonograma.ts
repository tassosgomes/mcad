import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarFonograma } from '../api/fonogramasApi';
import type { CriarFonogramaRequest } from '../types/fonograma';

export function useCreateFonograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CriarFonogramaRequest) => criarFonograma(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      if (data.obra?.id) {
        queryClient.invalidateQueries({ queryKey: ['fonogramas-obra', data.obra.id] });
      }
    },
  });
}
