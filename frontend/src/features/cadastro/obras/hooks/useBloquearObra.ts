import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bloquearObra } from '../api/obrasApi';
import { useToast } from '@shared/components/ui/toast';

interface BloquearParams {
  id: string;
  justificativa: string;
}

export function useBloquearObra() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, justificativa }: BloquearParams) => bloquearObra(id, { justificativa }),
    onSuccess: (data) => {
      queryClient.setQueryData(['obra', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['historico-obra', data.id] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Obra bloqueada com sucesso' });
    }
  });
}
