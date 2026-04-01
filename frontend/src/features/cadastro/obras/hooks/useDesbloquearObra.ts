import { useMutation, useQueryClient } from '@tanstack/react-query';
import { desbloquearObra } from '../api/obrasApi';
import { useToast } from '@shared/components/ui/toast';

export function useDesbloquearObra() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => desbloquearObra(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['obra', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['historico-obra', data.id] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Obra desbloqueada com sucesso' });
    }
  });
}
