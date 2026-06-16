import { apiGetIden } from '@services/apiIdentificacaoClient';
import type { UsuarioMusicaSnapshot } from '../types/usuario-musica-snapshot';

export interface BuscarUsuariosMusicaResponse {
  items: UsuarioMusicaSnapshot[];
}

export function buscarUsuariosMusica(query: string, cnpj?: string): Promise<BuscarUsuariosMusicaResponse> {
  const params = new URLSearchParams({ q: query });
  if (cnpj) params.set('cnpj', cnpj);
  return apiGetIden<BuscarUsuariosMusicaResponse>(`/usuarios-musica?${params}`);
}
