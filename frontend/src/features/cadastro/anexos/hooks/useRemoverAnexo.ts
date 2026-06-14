import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removerAnexo } from '../api/anexosApi';
import type { TipoEntidadeAnexo } from '../types/anexo';

export function useRemoverAnexo(tipo: TipoEntidadeAnexo, entidadeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (anexoId: string) => removerAnexo(tipo, entidadeId, anexoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', tipo, entidadeId] });
    },
  });
}
