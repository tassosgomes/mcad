import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calcularPercentuais } from '../api/participacoesApi';

export function useCalcularPercentuais(fonogramaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calcularPercentuais(fonogramaId),
    onSuccess: (response) => {
      queryClient.setQueryData(['participacoes', fonogramaId], response);
    },
  });
}
