import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getLicencas } from '../api/licencasApi';
import type { LicencaFiltros } from '../types/licenca';

export function useLicencas(filtros: LicencaFiltros) {
  return useQuery({
    queryKey: ['licencas', filtros],
    queryFn: () => getLicencas(filtros),
    placeholderData: keepPreviousData,
  });
}
