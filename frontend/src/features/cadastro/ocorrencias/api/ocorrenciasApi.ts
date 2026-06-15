import { apiGet, apiPost } from '@services/apiClient';
import type {
  Ocorrencia,
  OcorrenciaFiltros,
  OcorrenciaListResponse,
  ResolverOcorrenciaRequest,
  CancelarOcorrenciaRequest,
} from '../types/ocorrencia';

export function getOcorrencias(filtros: OcorrenciaFiltros): Promise<OcorrenciaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  params.set('sort', filtros.sort);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.titularId) params.set('titularId', filtros.titularId);
  if (filtros.titularNome) params.set('titularNome', filtros.titularNome);
  return apiGet<OcorrenciaListResponse>(`/ocorrencias?${params}`);
}

export function getOcorrenciaById(id: string): Promise<Ocorrencia> {
  return apiGet<Ocorrencia>(`/ocorrencias/${id}`);
}

export function assumirOcorrencia(id: string): Promise<Ocorrencia> {
  return apiPost<Ocorrencia>(`/ocorrencias/${id}/analisar`, {});
}

export function resolverOcorrencia(id: string, data: ResolverOcorrenciaRequest): Promise<Ocorrencia> {
  return apiPost<Ocorrencia>(`/ocorrencias/${id}/resolver`, data);
}

export function cancelarOcorrencia(id: string, data: CancelarOcorrenciaRequest): Promise<Ocorrencia> {
  return apiPost<Ocorrencia>(`/ocorrencias/${id}/cancelar`, data);
}
