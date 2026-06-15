import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelarOcorrencia } from '../api/ocorrenciasApi';
import type { CancelarOcorrenciaRequest } from '../types/ocorrencia';

export function useCancelarOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & CancelarOcorrenciaRequest) =>
      cancelarOcorrencia(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
  });
}
