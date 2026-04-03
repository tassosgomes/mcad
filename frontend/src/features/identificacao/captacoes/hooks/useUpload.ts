import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { getUploadById } from '../api/uploadsApi';

export function useUpload(captacaoId: string, uploadId: string | null) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);

  return useQuery({
    queryKey: ['uploads', captacaoId, uploadId],
    queryFn: () => getUploadById(captacaoId, uploadId!),
    enabled: !!uploadId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      // Quando transitar de PROCESSANDO → outro status, invalidar caches
      if (previousStatusRef.current === 'Processando' && data.status !== 'Processando') {
        queryClient.invalidateQueries({ queryKey: ['execucoes', captacaoId] });
        queryClient.invalidateQueries({ queryKey: ['captacoes', captacaoId] });
        queryClient.invalidateQueries({ queryKey: ['uploads', captacaoId] });
      }
      previousStatusRef.current = data.status;

      return data.status === 'Processando' ? 5000 : false;
    },
  });
}
