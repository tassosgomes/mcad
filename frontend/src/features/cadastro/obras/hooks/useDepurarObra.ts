import { useMutation, useQueryClient } from '@tanstack/react-query';
import { depurarObra } from '../api/obrasApi';

export function useDepurarObra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof depurarObra>[1] }) =>
      depurarObra(id, data),
    onSuccess: (res, variables) => {
      // Atualiza a obra depurada no cache
      queryClient.setQueryData(['obras', variables.id], res.obraDepurada);
      // Invalida as listas pq a nova obra e a depurada mudaram de stats
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
