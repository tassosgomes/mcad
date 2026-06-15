import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContato, atualizarContato } from '../api/contatoApi';

export function useContato() {
  return useQuery({
    queryKey: ['portal', 'contato'],
    queryFn: getContato,
  });
}

export function useAtualizarContato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: atualizarContato,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'contato'] });
    },
  });
}
