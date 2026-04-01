import {
  apiGet,
  apiPost,
  apiPut,
  apiDeleteWithBody,
} from '@services/apiClient';
import type {
  ParticipacoesResponse,
  AdicionarParticipacaoRequest,
  AjustarPercentualRequest,
  TitularResumo,
} from '../types/participacao';

const base = (fonogramaId: string) => `/fonogramas/${fonogramaId}/participacoes`;

export function getParticipacoes(fonogramaId: string): Promise<ParticipacoesResponse> {
  return apiGet<ParticipacoesResponse>(base(fonogramaId));
}

export function adicionarParticipacao(
  fonogramaId: string,
  data: AdicionarParticipacaoRequest
): Promise<ParticipacoesResponse> {
  return apiPost<ParticipacoesResponse>(base(fonogramaId), data);
}

export function ajustarPercentual(
  fonogramaId: string,
  participacaoId: string,
  data: AjustarPercentualRequest
): Promise<ParticipacoesResponse> {
  return apiPut<ParticipacoesResponse>(`${base(fonogramaId)}/${participacaoId}`, data);
}

export function removerParticipacao(
  fonogramaId: string,
  participacaoId: string
): Promise<ParticipacoesResponse> {
  // DELETE retorna 200 com body — usa apiDeleteWithBody (mesmo padrão de F04)
  return apiDeleteWithBody<ParticipacoesResponse>(`${base(fonogramaId)}/${participacaoId}`);
}

export function calcularPercentuais(fonogramaId: string): Promise<ParticipacoesResponse> {
  return apiPost<ParticipacoesResponse>(`${base(fonogramaId)}/calcular`, {});
}

// Reutilizado do F04 — busca titulares via autocomplete
export function buscarTitulares(q: string, limit = 10): Promise<TitularResumo[]> {
  return apiGet<TitularResumo[]>(`/titulares/busca?q=${encodeURIComponent(q)}&limit=${limit}`);
}
