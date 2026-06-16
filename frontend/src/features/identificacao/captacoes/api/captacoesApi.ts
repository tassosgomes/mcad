import { apiGetIden, apiPostIden, apiPutIden, apiDeleteIden } from '@services/apiIdentificacaoClient';
import type {
  CaptacaoListResponse, CaptacaoDetalhe, Captacao,
  CriarCaptacaoRequest, AtualizarCaptacaoRequest,
  CaptacaoFiltros, Rubrica, AnalistaResumo,
} from '../types/captacao';

const BASE = '/rubricas';
const CAPTACOES = '/captacoes';

// ── Rubricas ──
export function getRubricas(): Promise<Rubrica[]> {
  return apiGetIden<Rubrica[]>(BASE);
}

// ── Analistas ──
export function getAnalistas(): Promise<AnalistaResumo[]> {
  return apiGetIden<AnalistaResumo[]>('/analistas');
}

// ── Captações ──
export function getCaptacoes(filtros: CaptacaoFiltros): Promise<CaptacaoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.rubricaId) params.set('rubricaId', filtros.rubricaId);
  if (filtros.periodoInicio) params.set('periodoInicio', filtros.periodoInicio);
  if (filtros.periodoFim) params.set('periodoFim', filtros.periodoFim);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.analistaResponsavelId) params.set('analistaResponsavelId', filtros.analistaResponsavelId);
  return apiGetIden<CaptacaoListResponse>(`${CAPTACOES}?${params}`);
}

export function getCaptacaoById(id: string): Promise<CaptacaoDetalhe> {
  return apiGetIden<CaptacaoDetalhe>(`${CAPTACOES}/${id}`);
}

export function criarCaptacao(data: CriarCaptacaoRequest): Promise<Captacao> {
  return apiPostIden<Captacao>(CAPTACOES, data);
}

export function atualizarCaptacao(id: string, data: AtualizarCaptacaoRequest): Promise<Captacao> {
  return apiPutIden<Captacao>(`${CAPTACOES}/${id}`, data);
}

export function excluirCaptacao(id: string): Promise<void> {
  return apiDeleteIden(`${CAPTACOES}/${id}`);
}
