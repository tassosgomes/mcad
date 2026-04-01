import { useMutation, useQueryClient } from '@tanstack/react-query';
import { liberarObra } from '../api/obrasApi';
import { useToast } from '@shared/components/ui/toast';

export function useLiberarObra() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => liberarObra(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['obra', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      addToast({ type: 'success', title: 'Sucesso', message: 'Obra liberada com sucesso' });
    },
    onError: (error: any) => {
      // O frontend TechSpec não menciona tratamento específico no onError do hook,
      // ele geralmente é deixado para a UI tratar o error e exibir no ChecklistPreRequisitos se for 422.
    }
  });
}
