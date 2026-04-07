import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reativarLicenca } from '../api/licencasApi';
import type { TransicaoStatusRequest } from '../types/licenca';

export function useReativarLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransicaoStatusRequest }) =>
      reativarLicenca(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
      queryClient.invalidateQueries({ queryKey: ['licencas', id] });
    },
  });
}
