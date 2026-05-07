import { useMutation, useQueryClient } from '@tanstack/react-query';
import { atualizarUsuarioMusica } from '../api/usuariosMusicaApi';
import type { AtualizarUsuarioMusicaRequest } from '../types/usuario-musica';

export function useUpdateUsuarioMusica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AtualizarUsuarioMusicaRequest }) =>
      atualizarUsuarioMusica(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica', variables.id] });
    },
  });
}
