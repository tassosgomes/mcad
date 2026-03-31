import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarObra } from '../api/obrasApi';

export function useUpdateObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof atualizarObra>[1] }) =>
      atualizarObra(id, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['obras', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
