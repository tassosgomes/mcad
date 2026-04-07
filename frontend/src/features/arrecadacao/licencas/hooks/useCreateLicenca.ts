import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarLicenca } from '../api/licencasApi';

export function useCreateLicenca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarLicenca,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licencas'] });
    },
  });
}
