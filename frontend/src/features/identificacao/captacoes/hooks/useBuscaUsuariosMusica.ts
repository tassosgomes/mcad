import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@hooks/useDebounce';
import { buscarUsuariosMusica } from '../api/usuariosMusicaApi';
import type { UsuarioMusicaSnapshot } from '../types/usuario-musica-snapshot';

interface UseBuscaUsuariosMusicaResult {
  results: UsuarioMusicaSnapshot[];
  isFetching: boolean;
}

export function useBuscaUsuariosMusica(query: string): UseBuscaUsuariosMusicaResult {
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['usuarios-musica-id', debouncedQuery],
    queryFn: () => buscarUsuariosMusica(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  return {
    results: data?.items ?? [],
    isFetching,
  };
}
