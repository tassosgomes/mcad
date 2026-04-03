import { useQuery } from '@tanstack/react-query';
import { getErrosUpload } from '../api/uploadsApi';

export function useErrosUpload(captacaoId: string, uploadId: string | null, page = 1, size = 10) {
  return useQuery({
    queryKey: ['errosUpload', captacaoId, uploadId, page, size],
    queryFn: () => getErrosUpload(captacaoId, uploadId!, page, size),
    enabled: !!uploadId,
  });
}
