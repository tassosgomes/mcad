import { useQuery } from '@tanstack/react-query';
import { getHistoricoStatusUsuarioMusica } from '../api/usuariosMusicaApi';

export function useHistoricoStatusUsuarioMusica(id?: string) {
  return useQuery({
    queryKey: ['usuarios-musica', id, 'historico-status'],
    queryFn: () => getHistoricoStatusUsuarioMusica(id!),
    enabled: !!id,
  });
}
