import { apiGetArr, apiPostArr } from '@services/apiArrecadacaoClient';
import type {
  Licenca,
  LicencaListResponse,
  CriarLicencaRequest,
  TransicaoStatusRequest,
  HistoricoStatusLicenca,
  LicencaFiltros,
} from '../types/licenca';

interface BackendPageResponse<T> {
  items: T[];
  metadata: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

function mapLicencaListResponse(response: BackendPageResponse<Licenca>): LicencaListResponse {
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

export async function getLicencas(filtros: LicencaFiltros): Promise<LicencaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(Math.max(filtros.page - 1, 0)));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.usuarioMusicaId) params.set('usuarioMusicaId', filtros.usuarioMusicaId);
  if (filtros.razaoSocial) params.set('razaoSocial', filtros.razaoSocial);
  if (filtros.rubricaSigla) params.set('rubricaSigla', filtros.rubricaSigla);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.vigente !== undefined) params.set('vigente', String(filtros.vigente));
  const response = await apiGetArr<BackendPageResponse<Licenca>>(`/licencas?${params}`);
  return mapLicencaListResponse(response);
}

export function getLicencaById(id: string): Promise<Licenca> {
  return apiGetArr<Licenca>(`/licencas/${id}`);
}

export function criarLicenca(data: CriarLicencaRequest): Promise<Licenca> {
  return apiPostArr<Licenca>('/licencas', data);
}

export function suspenderLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca> {
  return apiPostArr<Licenca>(`/licencas/${id}/suspender`, data);
}

export function reativarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca> {
  return apiPostArr<Licenca>(`/licencas/${id}/reativar`, data);
}

export function encerrarLicenca(id: string, data: TransicaoStatusRequest): Promise<Licenca> {
  return apiPostArr<Licenca>(`/licencas/${id}/encerrar`, data);
}

export function getHistoricoStatusLicenca(id: string): Promise<HistoricoStatusLicenca[]> {
  return apiGetArr<HistoricoStatusLicenca[]>(`/licencas/${id}/historico-status`);
}
