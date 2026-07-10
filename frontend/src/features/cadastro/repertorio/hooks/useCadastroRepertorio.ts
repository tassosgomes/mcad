import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarTitularPorDocumento,
  registrarRepertorio,
  registrarRepertorioPendente,
  isIswcIndisponivel,
} from '../api/repertorioApi';
import type {
  RegistrarRepertorioCommand,
  CadastroRepertorioResponse,
  TitularResumoResponse,
} from '../types/repertorio';

export function useBuscarTitularPorDocumento(documento: string) {
  return useQuery<TitularResumoResponse | null>({
    queryKey: ['repertorios', 'titulares', 'buscar', documento],
    queryFn: () => buscarTitularPorDocumento(documento),
    enabled: documento.length > 0,
    staleTime: 30_000,
  });
}

interface UseRegistrarRepertorioOptions {
  onIswcIndisponivel?: (command: RegistrarRepertorioCommand) => void;
  onSuccess?: (data: CadastroRepertorioResponse) => void;
  onError?: (error: unknown) => void;
}

export function useRegistrarRepertorio(options?: UseRegistrarRepertorioOptions) {
  const queryClient = useQueryClient();

  return useMutation<CadastroRepertorioResponse, unknown, RegistrarRepertorioCommand>({
    mutationFn: (command) => registrarRepertorio(command),
    onError: (error, variables) => {
      if (isIswcIndisponivel(error)) {
        options?.onIswcIndisponivel?.(variables);
      }
      options?.onError?.(error);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['repertorios'] });
      options?.onSuccess?.(data);
    },
  });
}

interface UseRegistrarRepertorioPendenteOptions {
  onSuccess?: (data: CadastroRepertorioResponse) => void;
  onError?: (error: unknown) => void;
}

export function useRegistrarRepertorioPendente(options?: UseRegistrarRepertorioPendenteOptions) {
  const queryClient = useQueryClient();

  return useMutation<CadastroRepertorioResponse, unknown, RegistrarRepertorioCommand>({
    mutationFn: (command) => registrarRepertorioPendente(command),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['repertorios'] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}
