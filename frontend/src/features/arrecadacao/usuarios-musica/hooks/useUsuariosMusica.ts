import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUsuariosMusica } from '../api/usuariosMusicaApi';
import type { UsuarioMusicaFiltros } from '../types/usuario-musica';

export function useUsuariosMusica(filtros: UsuarioMusicaFiltros) {
  return useQuery({
    queryKey: ['usuarios-musica', filtros],
    queryFn: () => getUsuariosMusica(filtros),
    placeholderData: keepPreviousData,
  });
}
