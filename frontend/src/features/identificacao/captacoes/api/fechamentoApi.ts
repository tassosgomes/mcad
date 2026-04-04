import { apiGetIden, apiPostIden } from '@services/apiIdentificacaoClient';
import type { PreRequisitosResponse, FechamentoResponse } from '../types/fechamento';

export const getPreRequisitos = async (captacaoId: string): Promise<PreRequisitosResponse> => {
  return apiGetIden<PreRequisitosResponse>(`/captacoes/${captacaoId}/pre-requisitos`);
};

export const fecharRol = async (captacaoId: string): Promise<FechamentoResponse> => {
  return apiPostIden<FechamentoResponse>(`/captacoes/${captacaoId}/fechar`, {});
};


