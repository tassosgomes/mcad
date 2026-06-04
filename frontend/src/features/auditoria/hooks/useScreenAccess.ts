import { useQuery } from '@tanstack/react-query';
import { getScreenAccess, type ScreenAccessParams } from '../api/auditoriaApi';

export function useScreenAccess(params: ScreenAccessParams, enabled = true) {
  const hasFilter = Boolean(params.userId) || Boolean(params.screenId);
  const hasPeriod = Boolean(params.from) && Boolean(params.to);
  return useQuery({
    queryKey: ['screen-access', params],
    queryFn: () => getScreenAccess(params),
    enabled: enabled && hasFilter && hasPeriod,
  });
}
