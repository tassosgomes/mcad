import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editarTitularidade } from '../api/titularidadesApi';
import type { EditarTitularidadeRequest } from '../types/titularidade';

export function useEditTitularidade(obraId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditarTitularidadeRequest }) =>
      editarTitularidade(obraId, id, data),
    onSuccess: (response) => {
      queryClient.setQueryData(['titularidades', obraId], response);
    },
  });
}
