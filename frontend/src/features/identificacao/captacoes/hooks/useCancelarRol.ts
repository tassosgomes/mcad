import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cancelarRol } from '../api/cancelamentoApi';
import type { CancelarRolRequest, CancelamentoResponse } from '../types/cancelamento';


interface CancelarOptions {
  captacaoId: string;
  data: CancelarRolRequest;
  onSuccessCallback?: (response: CancelamentoResponse) => void;
}

export function useCancelarRol() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ captacaoId, data }: CancelarOptions) => cancelarRol(captacaoId, data),
    onSuccess: (data, variables) => {
      // Invalida listagem
      queryClient.invalidateQueries({ queryKey: ['captacoes'] });
      
      // Call cb se existente
      if (variables.onSuccessCallback) {
        variables.onSuccessCallback(data);
      }

      if (data.novaCaptacaoId) {
        // Redireciona para o detalhe da nova captação recriada
        navigate(`/identificacao/captacoes/${data.novaCaptacaoId}`);
      } else {
        // Não teve recriação, volta para listagem 
        navigate('/identificacao/captacoes');
      }
    },
    onError: (error) => {
      console.error('Erro ao cancelar rol:', error);
    },
  });
}
