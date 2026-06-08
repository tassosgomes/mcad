import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ativarRubrica } from '../api/rubricasApi';
import type { InativarRubricaData } from '../types/rubrica';

export function useAtivarRubrica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InativarRubricaData }) =>
      ativarRubrica(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      queryClient.invalidateQueries({ queryKey: ['rubricas', variables.id] });
    },
  });
}
