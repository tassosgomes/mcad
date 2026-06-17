import { apiGetArr, apiPostArr } from '@services/apiArrecadacaoClient';
import type {
  Pagamento,
  PagamentoListResponse,
  RegistrarPagamentoRequest,
  EmitirBoletoPagamentoRequest,
  BoletoDownloadResponse,
  BoletoStatusResponse,
  EstornarPagamentoRequest,
  PagamentoFiltros,
} from '../types/pagamento';

interface BackendPageResponse<T> {
  items: T[];
  metadata: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

function mapPagamentoListResponse(response: BackendPageResponse<Pagamento>): PagamentoListResponse {
  return {
    data: response.items,
    pagination: {
      page: response.metadata.page + 1,
      size: response.metadata.size,
      total: response.metadata.totalElements,
      totalPages: response.metadata.totalPages,
    },
  };
}

export async function getPagamentos(filtros: PagamentoFiltros): Promise<PagamentoListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(Math.max(filtros.page - 1, 0)));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.usuarioMusicaId) params.set('usuarioMusicaId', filtros.usuarioMusicaId);
  if (filtros.razaoSocial) params.set('razaoSocial', filtros.razaoSocial);
  if (filtros.rubricaSigla) params.set('rubricaSigla', filtros.rubricaSigla);
  if (filtros.periodo) params.set('periodo', filtros.periodo);
  if (filtros.status) params.set('status', filtros.status);

  const response = await apiGetArr<BackendPageResponse<Pagamento>>(`/pagamentos?${params}`);
  return mapPagamentoListResponse(response);
}

export function getPagamentoById(id: string): Promise<Pagamento> {
  return apiGetArr<Pagamento>(`/pagamentos/${id}`);
}

export function registrarPagamento(data: RegistrarPagamentoRequest): Promise<Pagamento> {
  return apiPostArr<Pagamento>('/pagamentos', data);
}

export function emitirBoletoPagamento(data: EmitirBoletoPagamentoRequest): Promise<Pagamento> {
  return apiPostArr<Pagamento>('/pagamentos/boletos', data);
}

export function getBoletoDownloadUrl(id: string): Promise<BoletoDownloadResponse> {
  return apiGetArr<BoletoDownloadResponse>(`/pagamentos/${id}/boleto/download`);
}

export function getBoletoStatus(id: string): Promise<BoletoStatusResponse> {
  return apiGetArr<BoletoStatusResponse>(`/pagamentos/${id}/boleto/status`);
}

export function estornarPagamento(id: string, data: EstornarPagamentoRequest): Promise<Pagamento> {
  return apiPostArr<Pagamento>(`/pagamentos/${id}/estornar`, data);
}
