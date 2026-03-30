import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarTitular } from '../api/titularesApi';

export function useCreateTitular() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarTitular,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['titulares'] });
    },
  });
}
