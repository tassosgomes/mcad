import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suspenderLicenca } from '../api/licencasApi';
import type { TransicaoStatusRequest } from '../types/licenca';

export function useSuspenderLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransicaoStatusRequest }) =>
      suspenderLicenca(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
      queryClient.invalidateQueries({ queryKey: ['licencas', id] });
    },
  });
}
