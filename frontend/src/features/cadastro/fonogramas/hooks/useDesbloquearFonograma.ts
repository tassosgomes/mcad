import { useMutation, useQueryClient } from '@tanstack/react-query';
import { desbloquearFonograma } from '../api/fonogramasApi';
import { useToast } from '@shared/components/ui/toast';

export function useDesbloquearFonograma() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => desbloquearFonograma(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['fonograma', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['historico-fonograma', data.id] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Fonograma desbloqueado com sucesso' });
    }
  });
}
