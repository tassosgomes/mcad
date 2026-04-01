import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarFonograma } from '../api/fonogramasApi';
import type { AtualizarFonogramaRequest } from '../types/fonograma';

interface UpdateProps {
  id: string;
  data: AtualizarFonogramaRequest;
}

export function useUpdateFonograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateProps) => atualizarFonograma(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas', variables.id] });
      if (data.obra?.id) {
        queryClient.invalidateQueries({ queryKey: ['fonogramas-obra', data.obra.id] });
      }
    },
  });
}
