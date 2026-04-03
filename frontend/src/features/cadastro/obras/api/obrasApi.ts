import { apiGet, apiPost, apiPut, apiDelete } from '@services/apiClient';
import type {
  ObraMusical,
  ObraListResponse,
  CriarObraRequest,
  AtualizarObraRequest,
  DepurarObraRequest,
  DepuracaoResponse,
  DominioPublicoRequest,
  ObraFiltros,
} from '../types/obra';

export function getObras(filtros: ObraFiltros): Promise<ObraListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.codigo) params.set('codigo', String(filtros.codigo));
  if (filtros.titulo) params.set('titulo', filtros.titulo);
  if (filtros.iswc) params.set('iswc', filtros.iswc);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.genero) params.set('genero', filtros.genero);

  return apiGet<ObraListResponse>(`/obras?${params}`);
}

export function getObraById(id: string): Promise<ObraMusical> {
  return apiGet<ObraMusical>(`/obras/${id}`);
}

export function criarObra(data: CriarObraRequest): Promise<ObraMusical> {
  return apiPost<ObraMusical>('/obras', data);
}

export function atualizarObra(id: string, data: AtualizarObraRequest): Promise<ObraMusical> {
  return apiPut<ObraMusical>(`/obras/${id}`, data);
}

export function excluirObra(id: string): Promise<void> {
  return apiDelete(`/obras/${id}`);
}

export function obterIswc(id: string): Promise<ObraMusical> {
  return apiPost<ObraMusical>(`/obras/${id}/iswc`, {});
}

export function depurarObra(id: string, data: DepurarObraRequest): Promise<DepuracaoResponse> {
  return apiPost<DepuracaoResponse>(`/obras/${id}/depurar`, data);
}

export function alterarDominioPublico(id: string, data: DominioPublicoRequest): Promise<ObraMusical> {
  return apiPut<ObraMusical>(`/obras/${id}/dominio-publico`, data);
}

export function liberarObra(id: string): Promise<ObraMusical> {
  return apiPost<ObraMusical>(`/obras/${id}/liberar`, {});
}

export function bloquearObra(id: string, data: import('../types/obra').BloquearRequest): Promise<ObraMusical> {
  return apiPost<ObraMusical>(`/obras/${id}/bloquear`, data);
}

export function desbloquearObra(id: string): Promise<ObraMusical> {
  return apiPost<ObraMusical>(`/obras/${id}/desbloquear`, {});
}

export function getHistoricoObra(id: string): Promise<import('../types/obra').HistoricoBloqueioItem[]> {
  return apiGet<import('../types/obra').HistoricoBloqueioItem[]>(`/obras/${id}/historico-bloqueios`);
}
