import { useMutation, useQueryClient } from '@tanstack/react-query';
import { criarRubrica } from '../api/rubricasApi';

export function useCreateRubrica() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: criarRubrica,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubricas'] });
    },
  });
}
