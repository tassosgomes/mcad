import { apiGetDist } from '@/shared/services/apiDistribuicaoClient';
import type {
  TitularesDemonstrativoPage,
  DemonstrativoTitular,
  ListarTitularesParams,
} from '../types';

export function listarTitularesDemonstrativo(
  processoId: string,
  params?: ListarTitularesParams
): Promise<TitularesDemonstrativoPage> {
  const search = new URLSearchParams();
  if (params?.titularNome) search.set('titularNome', params.titularNome);
  if (params?.page !== undefined) search.set('page', String(params.page));
  if (params?.size !== undefined) search.set('size', String(params.size));
  if (params?.sort) search.set('sort', params.sort);
  const query = search.toString();
  return apiGetDist<TitularesDemonstrativoPage>(
    `/processos/${processoId}/demonstrativos${query ? '?' + query : ''}`
  );
}

export function consultarDemonstrativoTitular(
  processoId: string,
  titularId: string
): Promise<DemonstrativoTitular> {
  return apiGetDist<DemonstrativoTitular>(
    `/processos/${processoId}/demonstrativos/${titularId}`
  );
}
