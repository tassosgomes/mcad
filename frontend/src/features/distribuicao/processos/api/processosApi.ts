import { apiGetDist, apiPostDist } from '@services/apiDistribuicaoClient';
import type {
  Processo,
  ProcessoListResponse,
  CriarProcessoRequest,
  CancelarProcessoRequest,
  Disponibilidade,
  ProcessoFiltros,
} from '../types/processo';

export function listarProcessos(filtros: ProcessoFiltros): Promise<ProcessoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  params.set('sort', filtros.sort);
  if (filtros.rubrica) params.set('rubrica', filtros.rubrica);
  if (filtros.periodo) params.set('periodo', filtros.periodo);
  if (filtros.status) params.set('status', filtros.status);
  return apiGetDist<ProcessoListResponse>(`/processos?${params}`);
}

export function buscarProcesso(id: string): Promise<Processo> {
  return apiGetDist<Processo>(`/processos/${id}`);
}

export function listarDisponiveis(): Promise<Disponibilidade[]> {
  return apiGetDist<Disponibilidade[]>('/processos/disponiveis');
}

export function criarProcesso(data: CriarProcessoRequest): Promise<Processo> {
  return apiPostDist<Processo>('/processos', data);
}

export function calcularProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/calcular`, {});
}

export function aprovarProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/aprovar`, {});
}

export function finalizarProcesso(id: string): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/finalizar`, {});
}

export function cancelarProcesso(id: string, data: CancelarProcessoRequest): Promise<Processo> {
  return apiPostDist<Processo>(`/processos/${id}/cancelar`, data);
}
