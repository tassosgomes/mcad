import { useQuery } from '@tanstack/react-query';
import { getHistoricoStatusLicenca } from '../api/licencasApi';

export function useHistoricoStatusLicenca(id: string) {
  return useQuery({
    queryKey: ['licencas', id, 'historico-status'],
    queryFn: () => getHistoricoStatusLicenca(id),
    enabled: !!id,
  });
}
