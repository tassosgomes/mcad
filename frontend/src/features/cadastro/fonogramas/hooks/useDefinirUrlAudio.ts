import { useMutation, useQueryClient } from '@tanstack/react-query';
import { definirUrlAudio } from '../api/fonogramasApi';
import { useToast } from '@shared/components/ui/toast';

interface UrlAudioParams {
  id: string;
  url: string | null;
}

export function useDefinirUrlAudio() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, url }: UrlAudioParams) => definirUrlAudio(id, { url }),
    onSuccess: (data) => {
      queryClient.setQueryData(['fonograma', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['fonogramas'] });
      addToast({ type: 'success', title: 'Sucesso', message: 'URL do áudio atualizada' });
    }
  });
}
