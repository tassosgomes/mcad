import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bloquearFonograma } from '../api/fonogramasApi';
import { useToast } from '@shared/components/ui/toast';

interface BloquearParams {
  id: string;
  justificativa: string;
}

export function useBloquearFonograma() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, justificativa }: BloquearParams) => bloquearFonograma(id, { justificativa }),
    onSuccess: (data) => {
      queryClient.setQueryData(['fonograma', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      queryClient.invalidateQueries({ queryKey: ['historico-fonograma', data.id] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Fonograma bloqueado com sucesso' });
    }
  });
}
