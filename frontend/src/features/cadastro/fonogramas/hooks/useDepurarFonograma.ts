import { useMutation, useQueryClient } from '@tanstack/react-query';
import { depurarFonograma } from '../api/fonogramasApi';
import type { DepurarFonogramaRequest } from '../types/fonograma';

interface DepurarProps {
  id: string;
  data: DepurarFonogramaRequest;
}

export function useDepurarFonograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: DepurarProps) => depurarFonograma(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas-obra'] });
    },
  });
}
