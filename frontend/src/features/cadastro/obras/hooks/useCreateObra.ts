import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarObra } from '../api/obrasApi';

export function useCreateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarObra,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
