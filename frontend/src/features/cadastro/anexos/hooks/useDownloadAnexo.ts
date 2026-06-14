import { useMutation } from '@tanstack/react-query';
import { getDownloadUrl } from '../api/anexosApi';
import type { TipoEntidadeAnexo } from '../types/anexo';

export function useDownloadAnexo(tipo: TipoEntidadeAnexo, entidadeId: string) {
  return useMutation({
    mutationFn: (anexoId: string) => getDownloadUrl(tipo, entidadeId, anexoId),
    onSuccess: ({ downloadUrl }) => {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    },
  });
}
