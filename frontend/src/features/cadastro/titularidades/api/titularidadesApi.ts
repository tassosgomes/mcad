import {
  apiGet,
  apiPost,
  apiPut,
  apiDeleteWithBody,
} from '@services/apiClient';
import type {
  TitularidadesResponse,
  TitularResumo,
  AdicionarTitularidadeRequest,
  EditarTitularidadeRequest,
} from '../types/titularidade';

export function getTitularidades(obraId: string): Promise<TitularidadesResponse> {
  return apiGet<TitularidadesResponse>(`/obras/${obraId}/titularidades`);
}

export function adicionarTitularidade(
  obraId: string,
  data: AdicionarTitularidadeRequest
): Promise<TitularidadesResponse> {
  return apiPost<TitularidadesResponse>(`/obras/${obraId}/titularidades`, data);
}

export function editarTitularidade(
  obraId: string,
  id: string,
  data: EditarTitularidadeRequest
): Promise<TitularidadesResponse> {
  return apiPut<TitularidadesResponse>(`/obras/${obraId}/titularidades/${id}`, data);
}

export function removerTitularidade(
  obraId: string,
  id: string
): Promise<TitularidadesResponse> {
  // DELETE retorna 200 com body (não 204) — usa apiDeleteWithBody
  return apiDeleteWithBody<TitularidadesResponse>(`/obras/${obraId}/titularidades/${id}`);
}

export function buscarTitulares(q: string, limit = 10): Promise<TitularResumo[]> {
  return apiGet<TitularResumo[]>(`/titulares/busca?q=${encodeURIComponent(q)}&limit=${limit}`);
}
