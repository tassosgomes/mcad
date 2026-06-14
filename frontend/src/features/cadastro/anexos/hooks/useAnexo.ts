import { useQuery } from '@tanstack/react-query';
import { getAnexo } from '../api/anexosApi';
import type { TipoEntidadeAnexo } from '../types/anexo';

export function useAnexo(tipo: TipoEntidadeAnexo, entidadeId: string, anexoId: string | null) {
  return useQuery({
    queryKey: ['anexos', tipo, entidadeId, anexoId],
    queryFn: () => getAnexo(tipo, entidadeId, anexoId!),
    enabled: !!anexoId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.statusScan === 'pending_scan') return 3000;
      return false;
    },
  });
}
