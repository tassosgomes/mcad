import { useQuery } from '@tanstack/react-query';
import { buscarCadastro } from '../api/buscaCadastroApi';
import { useDebounce } from '@/shared/hooks/useDebounce';

export function useBuscaCadastro(termo: string, tipo?: string) {
  const debouncedTermo = useDebounce(termo, 300);
  
  return useQuery({
    queryKey: ['buscaCadastro', debouncedTermo, tipo],
    queryFn: () => buscarCadastro(debouncedTermo, tipo, 20),
    enabled: debouncedTermo.length >= 3,
    staleTime: 1000 * 30, // 30s cache para buscas
    select: (data) => data.resultados,
  });
}
