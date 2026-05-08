import { useQuery } from '@tanstack/react-query';
import { getScreenAccess, type ScreenAccessParams } from '../api/auditoriaApi';

export function useScreenAccess(params: ScreenAccessParams, enabled = true) {
  return useQuery({
    queryKey: ['screen-access', params],
    queryFn: () => getScreenAccess(params),
    enabled: enabled && Boolean(params.screenId) && Boolean(params.from) && Boolean(params.to),
  });
}
