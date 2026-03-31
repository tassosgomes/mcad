import { useMutation, useQueryClient } from '@tanstack/react-query';
import { alterarDominioPublico } from '../api/obrasApi';

export function useDominioPublico() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof alterarDominioPublico>[1] }) =>
      alterarDominioPublico(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['obras', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
