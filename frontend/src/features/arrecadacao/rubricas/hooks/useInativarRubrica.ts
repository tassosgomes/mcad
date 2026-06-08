import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inativarRubrica } from '../api/rubricasApi';
import type { InativarRubricaData } from '../types/rubrica';

export function useInativarRubrica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InativarRubricaData }) =>
      inativarRubrica(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      queryClient.invalidateQueries({ queryKey: ['rubricas', variables.id] });
    },
  });
}
