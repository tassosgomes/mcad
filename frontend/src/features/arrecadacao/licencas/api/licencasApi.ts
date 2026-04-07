import { apiGetArr, apiPostArr } from '@services/apiArrecadacaoClient';
import type {
  Licenca,
  LicencaListResponse,
  CriarLicencaRequest,
  TransicaoStatusRequest,
  HistoricoStatusLicenca,
  LicencaFiltros,
} from '../types/licenca';

export function getLicencas(filtros: LicencaFiltros): Promise<LicencaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filtros.page));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.usuarioMusicaId) params.set('usuarioMusicaId', filtros.usuarioMusicaId);
  if (filtros.razaoSocial) params.set('razaoSocial', filtros.razaoSocial);
  if (filtros.rubricaSigla) params.set('rubricaSigla', filtros.rubricaSigla);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.vigente !== undefined) params.set('vigente', String(filtros.vigente));
  return apiGetArr<LicencaListResponse>(`/licencas?${params}`);
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
