import { apiGet, apiPost } from '@services/apiClient';
import type {
  SolicitacaoAlteracao,
  SolicitacaoFiltros,
  SolicitacaoListResponse,
  RejeitarSolicitacaoRequest,
} from '../types/solicitacao';

export function getSolicitacoes(filtros: SolicitacaoFiltros): Promise<SolicitacaoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  params.set('sort', filtros.sort);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.titularId) params.set('titularId', filtros.titularId);
  if (filtros.titularNome) params.set('titularNome', filtros.titularNome);
  return apiGet<SolicitacaoListResponse>(`/solicitacoes-alteracao?${params}`);
}

export function getSolicitacaoById(id: string): Promise<SolicitacaoAlteracao> {
  return apiGet<SolicitacaoAlteracao>(`/solicitacoes-alteracao/${id}`);
}

export function aprovarSolicitacao(id: string): Promise<SolicitacaoAlteracao> {
  return apiPost<SolicitacaoAlteracao>(`/solicitacoes-alteracao/${id}/aprovar`, {});
}

export function rejeitarSolicitacao(id: string, data: RejeitarSolicitacaoRequest): Promise<SolicitacaoAlteracao> {
  return apiPost<SolicitacaoAlteracao>(`/solicitacoes-alteracao/${id}/rejeitar`, data);
}
