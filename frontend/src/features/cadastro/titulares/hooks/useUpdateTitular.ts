import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarTitular } from '../api/titularesApi';
import type { AtualizarTitularRequest } from '../types/titular';

export function useUpdateTitular() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarTitularRequest }) =>
      atualizarTitular(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['titulares'] });
      queryClient.invalidateQueries({ queryKey: ['titulares', id] });
    },
  });
}
