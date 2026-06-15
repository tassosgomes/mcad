import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assumirOcorrencia } from '../api/ocorrenciasApi';

export function useAssumirOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assumirOcorrencia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
    },
  });
}
