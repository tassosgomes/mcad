import { useQuery } from '@tanstack/react-query';
import { getUdaVigente } from '../api/udaApi';

export function useUdaVigente() {
  return useQuery({ queryKey: ['uda', 'vigente'], queryFn: getUdaVigente, retry: false });
}
