import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarProcesso,
  calcularProcesso,
  aprovarProcesso,
  finalizarProcesso,
  cancelarProcesso,
} from '../api/processosApi';
import type { CriarProcessoRequest, CancelarProcessoRequest } from '../types/processo';

export function useCriarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CriarProcessoRequest) => criarProcesso(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
    },
  });
}

export function useCalcularProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => calcularProcesso(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useAprovarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aprovarProcesso(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useFinalizarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => finalizarProcesso(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}

export function useCancelarProcesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelarProcessoRequest }) =>
      cancelarProcesso(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos'] });
      queryClient.invalidateQueries({ queryKey: ['distribuicao', 'processos', id] });
    },
  });
}
