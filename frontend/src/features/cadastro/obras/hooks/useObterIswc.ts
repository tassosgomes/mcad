import { useMutation, useQueryClient } from '@tanstack/react-query';
import { obterIswc } from '../api/obrasApi';

export function useObterIswc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: obterIswc,
    onSuccess: (data, id) => {
      queryClient.setQueryData(['obras', id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
    },
  });
}
