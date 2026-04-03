import { useMutation } from '@tanstack/react-query';
import { criarObraPendente } from '../api/buscaCadastroApi';
import { CriarObraPendenteRequest } from '../types/execucao';

export function useCreateObraPendente() {
  return useMutation({
    mutationFn: (data: CriarObraPendenteRequest) => criarObraPendente(data),
  });
}
