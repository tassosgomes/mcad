import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/dashboardApi';
import { useAuth } from '@shared/auth/useAuth';

export const DASHBOARD_QUERY_KEY = ['dashboard', 'summary'] as const;

export function useDashboardSummary() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: getDashboardSummary,
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
