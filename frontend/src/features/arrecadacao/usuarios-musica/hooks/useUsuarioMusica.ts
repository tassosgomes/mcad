import { useQuery } from '@tanstack/react-query';
import { getUsuarioMusicaById } from '../api/usuariosMusicaApi';

export function useUsuarioMusica(id?: string) {
  return useQuery({
    queryKey: ['usuarios-musica', id],
    queryFn: () => getUsuarioMusicaById(id!),
    enabled: !!id,
  });
}
