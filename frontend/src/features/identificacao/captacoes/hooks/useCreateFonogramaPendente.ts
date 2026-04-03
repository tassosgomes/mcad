import { useMutation } from '@tanstack/react-query';
import { criarFonogramaPendente } from '../api/buscaCadastroApi';
import { CriarFonogramaPendenteRequest } from '../types/execucao';

export function useCreateFonogramaPendente() {
  return useMutation({
    mutationFn: (data: CriarFonogramaPendenteRequest) => criarFonogramaPendente(data),
  });
}
