import { useQuery } from '@tanstack/react-query';
import {
  listarTitularesDemonstrativo,
  consultarDemonstrativoTitular,
} from '../api/demonstrativosApi';
import type { ListarTitularesParams } from '../types';

export function useListarTitularesDemonstrativo(
  processoId: string,
  params?: ListarTitularesParams
) {
  return useQuery({
    queryKey: ['distribuicao', 'demonstrativos', 'titulares', processoId, params],
    queryFn: () => listarTitularesDemonstrativo(processoId, params),
    enabled: !!processoId,
    placeholderData: (previousData) => previousData,
  });
}

export function useConsultarDemonstrativoTitular(
  processoId: string,
  titularId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['distribuicao', 'demonstrativos', 'titular', processoId, titularId],
    queryFn: () => consultarDemonstrativoTitular(processoId, titularId!),
    enabled: !!processoId && !!titularId && (options?.enabled ?? true),
  });
}
