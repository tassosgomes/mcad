import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarRubrica } from '../api/rubricasApi';
import type { AtualizarRubricaData } from '../types/rubrica';

export function useUpdateRubrica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarRubricaData }) =>
      atualizarRubrica(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
      queryClient.invalidateQueries({ queryKey: ['rubricas', variables.id] });
    },
  });
}
