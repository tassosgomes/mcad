import { apiGetIden, apiPostIden, apiPutIden, apiDeleteIden } from '@shared/services/apiIdentificacaoClient';
import {
  AtualizarExecucaoRequest,
  CriarExecucaoRequest,
  Execucao,
  FiltrosExecucao,
  ListarExecucoesResponse,
  TipoUtilizacao,
} from '../types/execucao';

export async function getTiposUtilizacao(): Promise<TipoUtilizacao[]> {
  return apiGetIden<TipoUtilizacao[]>('/tipos-utilizacao');
}

export async function getExecucoes(
  captacaoId: string,
  filtros: FiltrosExecucao
): Promise<ListarExecucoesResponse> {
  const query = new URLSearchParams();
  if (filtros.page) query.append('page', filtros.page.toString());
  if (filtros.size) query.append('size', filtros.size.toString());
  if (filtros.status) query.append('status', filtros.status);
  if (filtros.sort) query.append('sort', filtros.sort);

  const qs = query.toString() ? `?${query.toString()}` : '';
  return apiGetIden<ListarExecucoesResponse>(`/captacoes/${captacaoId}/execucoes${qs}`);
}

export async function criarExecucao(captacaoId: string, data: CriarExecucaoRequest): Promise<Execucao> {
  return apiPostIden<Execucao>(`/captacoes/${captacaoId}/execucoes`, data);
}

export async function atualizarExecucao(
  captacaoId: string,
  id: string,
  data: AtualizarExecucaoRequest
): Promise<Execucao> {
  return apiPutIden<Execucao>(`/captacoes/${captacaoId}/execucoes/${id}`, data);
}

export async function excluirExecucao(captacaoId: string, id: string): Promise<void> {
  return apiDeleteIden(`/captacoes/${captacaoId}/execucoes/${id}`);
}
