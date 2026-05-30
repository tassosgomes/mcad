import { useQuery } from '@tanstack/react-query';
import { bffGet } from '@services/apiBffClient';
import { useAuth } from './useAuth';

export const ME_QUERY_KEY = ['auth', 'me'] as const;

export interface EffectiveProfile {
  subjectId: string;
  name?: string;
  email?: string;
  primaryRole?: string | null;
  roles?: string[];
}

export function useEffectiveProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ME_QUERY_KEY,
    enabled: isAuthenticated,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: () => bffGet<EffectiveProfile>('/me'),
  });
}
