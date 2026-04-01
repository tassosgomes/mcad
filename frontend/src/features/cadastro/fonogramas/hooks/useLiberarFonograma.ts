import { useMutation, useQueryClient } from '@tanstack/react-query';
import { liberarFonograma } from '../api/fonogramasApi';
import { useToast } from '@shared/components/ui/toast';

export function useLiberarFonograma() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => liberarFonograma(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['fonograma', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Fonograma liberado com sucesso' });
    }
  });
}
