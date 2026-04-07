import { useQuery } from '@tanstack/react-query';
import { getLicencaById } from '../api/licencasApi';

export function useLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id],
    queryFn: () => getLicencaById(id),
    enabled: !!id,
  });
}
