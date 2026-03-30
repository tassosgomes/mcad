import { apiGet, apiPost, apiPut, apiDelete } from '@services/apiClient';
import type {
  Titular,
  TitularListResponse,
  CriarTitularRequest,
  AtualizarTitularRequest,
  TitularFiltros,
} from '../types/titular';

export function getTitulares(filtros: TitularFiltros): Promise<TitularListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.nome) params.set('nome', filtros.nome);
  if (filtros.documento) params.set('documento', filtros.documento);
  if (filtros.associacaoId) params.set('associacaoId', filtros.associacaoId);
  if (filtros.status) params.set('status', filtros.status);
  return apiGet<TitularListResponse>(`/titulares?${params}`);
}

export function getTitularById(id: string): Promise<Titular> {
  return apiGet<Titular>(`/titulares/${id}`);
}

export function criarTitular(data: CriarTitularRequest): Promise<Titular> {
  return apiPost<Titular>('/titulares', data);
}

export function atualizarTitular(id: string, data: AtualizarTitularRequest): Promise<Titular> {
  return apiPut<Titular>(`/titulares/${id}`, data);
}

export function excluirTitular(id: string): Promise<void> {
  return apiDelete(`/titulares/${id}`);
}
