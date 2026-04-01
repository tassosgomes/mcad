import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@services/apiClient';
import type {
  Fonograma,
  FonogramaListResponse,
  FonogramaResumo,
  FonogramaFiltros,
  CriarFonogramaRequest,
  AtualizarFonogramaRequest,
  DepurarFonogramaRequest,
  DepuracaoFonogramaResponse
} from '../types/fonograma';

export function getFonogramas(filtros: FonogramaFiltros): Promise<FonogramaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.isrc) params.set('isrc', filtros.isrc);
  if (filtros.obraId) params.set('obraId', filtros.obraId);
  if (filtros.obraTitulo) params.set('obra', filtros.obraTitulo); // Using obra query param
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.pais) params.set('pais', filtros.pais);

  return apiGet<FonogramaListResponse>(`/fonogramas?${params}`);
}

export function getFonogramaById(id: string): Promise<Fonograma> {
  return apiGet<Fonograma>(`/fonogramas/${id}`);
}

export function getFonogramasDaObra(obraId: string): Promise<FonogramaResumo[]> {
  return apiGet<FonogramaResumo[]>(`/obras/${obraId}/fonogramas`);
}

export function criarFonograma(data: CriarFonogramaRequest): Promise<Fonograma> {
  return apiPost<Fonograma>('/fonogramas', data);
}

export function atualizarFonograma(id: string, data: AtualizarFonogramaRequest): Promise<Fonograma> {
  return apiPut<Fonograma>(`/fonogramas/${id}`, data);
}

export function excluirFonograma(id: string): Promise<void> {
  return apiDelete(`/fonogramas/${id}`);
}

export function depurarFonograma(id: string, data: DepurarFonogramaRequest): Promise<DepuracaoFonogramaResponse> {
  return apiPost<DepuracaoFonogramaResponse>(`/fonogramas/${id}/depurar`, data);
}

export function liberarFonograma(id: string): Promise<Fonograma> {
  return apiPost<Fonograma>(`/fonogramas/${id}/liberar`, {});
}

export function bloquearFonograma(id: string, data: { justificativa: string }): Promise<Fonograma> {
  return apiPost<Fonograma>(`/fonogramas/${id}/bloquear`, data);
}

export function desbloquearFonograma(id: string): Promise<Fonograma> {
  return apiPost<Fonograma>(`/fonogramas/${id}/desbloquear`, {});
}

export function getHistoricoFonograma(id: string): Promise<import('../../obras/types/obra').HistoricoBloqueioItem[]> {
  return apiGet<import('../../obras/types/obra').HistoricoBloqueioItem[]>(`/fonogramas/${id}/historico-bloqueios`);
}

export function definirUrlAudio(id: string, data: { url: string | null }): Promise<Fonograma> {
  return apiPatch<Fonograma>(`/fonogramas/${id}/url-audio`, data); 
}

