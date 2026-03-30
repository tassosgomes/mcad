import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirTitular } from '../api/titularesApi';

export function useDeleteTitular() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: excluirTitular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulares'] });
    },
  });
}
