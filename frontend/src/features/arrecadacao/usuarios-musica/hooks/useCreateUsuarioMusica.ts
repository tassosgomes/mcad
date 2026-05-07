import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarUsuarioMusica } from '../api/usuariosMusicaApi';

export function useCreateUsuarioMusica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarUsuarioMusica,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-musica'] });
    },
  });
}
