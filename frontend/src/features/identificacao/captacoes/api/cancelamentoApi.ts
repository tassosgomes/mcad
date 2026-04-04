import { apiGetIden, apiPostIden } from '@services/apiIdentificacaoClient';
import type { PodeCancelarResponse, CancelarRolRequest, CancelamentoResponse } from '../types/cancelamento';

const CAPTACOES = '/captacoes';

export function podeCancelarRol(captacaoId: string): Promise<PodeCancelarResponse> {
  return apiGetIden<PodeCancelarResponse>(`${CAPTACOES}/${captacaoId}/pode-cancelar`);
}

export function cancelarRol(captacaoId: string, data: CancelarRolRequest): Promise<CancelamentoResponse> {
  return apiPostIden<CancelamentoResponse>(`${CAPTACOES}/${captacaoId}/cancelar`, data);
}
