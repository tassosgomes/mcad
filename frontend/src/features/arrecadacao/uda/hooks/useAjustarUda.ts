import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ajustarUda } from '../api/udaApi';

export function useAjustarUda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ajustarUda,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['uda'] }); },
  });
}
