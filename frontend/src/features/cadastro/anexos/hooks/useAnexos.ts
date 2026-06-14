import { useQuery } from '@tanstack/react-query';
import { getAnexos } from '../api/anexosApi';
import type { TipoEntidadeAnexo } from '../types/anexo';

export function useAnexos(tipo: TipoEntidadeAnexo, entidadeId: string) {
  return useQuery({
    queryKey: ['anexos', tipo, entidadeId],
    queryFn: () => getAnexos(tipo, entidadeId),
    enabled: !!entidadeId,
  });
}
