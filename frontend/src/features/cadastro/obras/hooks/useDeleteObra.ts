import { useMutation, useQueryClient } from '@tanstack/react-query';
import { excluirObra } from '../api/obrasApi';

export function useDeleteObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: excluirObra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
