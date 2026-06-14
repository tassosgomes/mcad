import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadAnexo } from '../api/anexosApi';
import type { CategoriaAnexo, TipoEntidadeAnexo } from '../types/anexo';

export function useUploadAnexo(tipo: TipoEntidadeAnexo, entidadeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ arquivo, categoria }: { arquivo: File; categoria: CategoriaAnexo }) =>
      uploadAnexo(tipo, entidadeId, arquivo, categoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos', tipo, entidadeId] });
    },
  });
}
