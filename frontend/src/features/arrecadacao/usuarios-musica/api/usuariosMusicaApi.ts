import { apiGetArr, apiPostArr, apiPutArr } from '@services/apiArrecadacaoClient';
import type {
  AlterarStatusUsuarioMusicaRequest,
  AtualizarUsuarioMusicaRequest,
  CriarUsuarioMusicaRequest,
  HistoricoStatusUsuarioMusica,
  UsuarioMusica,
  UsuarioMusicaFiltros,
  UsuarioMusicaListResponse,
} from '../types/usuario-musica';

interface BackendUsuarioMusica extends Omit<UsuarioMusica, 'cnpj'> {
  cnpj?: string;
  cnpjValor?: string;
}

interface BackendPageResponse<T> {
  items: T[];
  metadata: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

function mapUsuario(usuario: BackendUsuarioMusica): UsuarioMusica {
  return {
    ...usuario,
    cnpj: usuario.cnpj ?? usuario.cnpjValor ?? '',
  };
}

function mapListResponse(response: BackendPageResponse<BackendUsuarioMusica>): UsuarioMusicaListResponse {
  return {
    data: response.items.map(mapUsuario),
    pagination: {
      page: response.metadata.page + 1,
      size: response.metadata.size,
      total: response.metadata.totalElements,
      totalPages: response.metadata.totalPages,
    },
  };
}

export async function getUsuariosMusica(filtros: UsuarioMusicaFiltros): Promise<UsuarioMusicaListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(Math.max(filtros.page - 1, 0)));
  params.set('size', String(filtros.size));
  if (filtros.sort) params.set('sort', filtros.sort);
  if (filtros.razaoSocial) params.set('razaoSocial', filtros.razaoSocial);
  if (filtros.cnpj) params.set('cnpj', filtros.cnpj);
  if (filtros.status) params.set('status', filtros.status);
  if (filtros.cidade) params.set('cidade', filtros.cidade);

  const response = await apiGetArr<BackendPageResponse<BackendUsuarioMusica>>(`/usuarios-musica?${params}`);
  return mapListResponse(response);
}

export async function getUsuarioMusicaById(id: string): Promise<UsuarioMusica> {
  const response = await apiGetArr<BackendUsuarioMusica>(`/usuarios-musica/${id}`);
  return mapUsuario(response);
}

export async function criarUsuarioMusica(data: CriarUsuarioMusicaRequest): Promise<UsuarioMusica> {
  const response = await apiPostArr<BackendUsuarioMusica>('/usuarios-musica', data);
  return mapUsuario(response);
}

export async function atualizarUsuarioMusica(
  id: string,
  data: AtualizarUsuarioMusicaRequest,
): Promise<UsuarioMusica> {
  const response = await apiPutArr<BackendUsuarioMusica>(`/usuarios-musica/${id}`, data);
  return mapUsuario(response);
}

export async function inativarUsuarioMusica(
  id: string,
  data: AlterarStatusUsuarioMusicaRequest,
): Promise<UsuarioMusica> {
  const response = await apiPostArr<BackendUsuarioMusica>(`/usuarios-musica/${id}/inativar`, data);
  return mapUsuario(response);
}

export async function ativarUsuarioMusica(
  id: string,
  data: AlterarStatusUsuarioMusicaRequest,
): Promise<UsuarioMusica> {
  const response = await apiPostArr<BackendUsuarioMusica>(`/usuarios-musica/${id}/ativar`, data);
  return mapUsuario(response);
}

export function getHistoricoStatusUsuarioMusica(id: string): Promise<HistoricoStatusUsuarioMusica[]> {
  return apiGetArr<HistoricoStatusUsuarioMusica[]>(`/usuarios-musica/${id}/historico-status`);
}
