import { apiGetArr } from '@services/apiArrecadacaoClient';
import type {
  Verba,
  VerbaAgregado,
  VerbaListResponse,
  VerbasFilter,
  VerbasAgregadoFilter,
} from '../types/verba';

interface BackendPageResponse<T> {
  items: T[];
  metadata: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

function mapVerbaListResponse(response: BackendPageResponse<Verba>): VerbaListResponse {
  return {
    data: response.items,
    pagination: {
      page: response.metadata.page,
      size: response.metadata.size,
      total: response.metadata.totalElements,
      totalPages: response.metadata.totalPages,
    },
  };
}

export async function listarVerbas(filtros: VerbasFilter): Promise<VerbaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.rubricaSigla) params.set('rubricaSigla', filtros.rubricaSigla);
  if (filtros.periodo) params.set('periodo', filtros.periodo);
  if (filtros.periodoInicio) params.set('periodoInicio', filtros.periodoInicio);
  if (filtros.periodoFim) params.set('periodoFim', filtros.periodoFim);
  if (filtros.status) params.set('status', filtros.status);

  const response = await apiGetArr<BackendPageResponse<Verba>>(`/verbas?${params}`);
  return mapVerbaListResponse(response);
}

export function listarVerbasAgregadas(filtros: VerbasAgregadoFilter): Promise<VerbaAgregado[]> {
  const params = new URLSearchParams();
  if (filtros.periodoInicio) params.set('periodoInicio', filtros.periodoInicio);
  if (filtros.periodoFim) params.set('periodoFim', filtros.periodoFim);
  if (filtros.status) params.set('status', filtros.status);

  const query = params.toString();
  return apiGetArr<VerbaAgregado[]>(`/verbas/agregado-por-rubrica${query ? `?${query}` : ''}`);
}

export function buscarVerba(rubricaSigla: string, periodo: string): Promise<Verba> {
  return apiGetArr<Verba>(`/verbas/${encodeURIComponent(rubricaSigla)}/${encodeURIComponent(periodo)}`);
}
