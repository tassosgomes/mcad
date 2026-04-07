import { useMutation, useQueryClient } from '@tanstack/react-query';
import { encerrarLicenca } from '../api/licencasApi';
import type { TransicaoStatusRequest } from '../types/licenca';

export function useEncerrarLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransicaoStatusRequest }) =>
      encerrarLicenca(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
      queryClient.invalidateQueries({ queryKey: ['licencas', id] });
    },
  });
}
