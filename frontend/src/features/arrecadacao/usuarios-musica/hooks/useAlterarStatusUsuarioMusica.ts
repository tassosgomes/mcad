import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ativarUsuarioMusica, inativarUsuarioMusica } from '../api/usuariosMusicaApi';
import type { AlterarStatusUsuarioMusicaRequest } from '../types/usuario-musica';

export type AcaoStatusUsuarioMusica = 'ativar' | 'inativar';

export function useAlterarStatusUsuarioMusica(acao: AcaoStatusUsuarioMusica) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AlterarStatusUsuarioMusicaRequest }) =>
      acao === 'ativar' ? ativarUsuarioMusica(id, data) : inativarUsuarioMusica(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica', variables.id, 'historico-status'] });
    },
  });
}
