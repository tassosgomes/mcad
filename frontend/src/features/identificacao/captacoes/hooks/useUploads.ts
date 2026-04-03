import { useQuery } from '@tanstack/react-query';
import { getUploads } from '../api/uploadsApi';

export function useUploads(captacaoId: string, page = 1, size = 10) {
  return useQuery({
    queryKey: ['uploads', captacaoId, page, size],
    queryFn: () => getUploads(captacaoId, page, size),
    enabled: !!captacaoId,
  });
}
