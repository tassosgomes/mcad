import { apiGetArr, apiPostArr } from '@services/apiArrecadacaoClient';
import type { UdaValor, AjustarUdaRequest } from '../types/uda';

export function getUdaVigente(): Promise<UdaValor> {
  return apiGetArr<UdaValor>('/uda/vigente');
}

export function ajustarUda(data: AjustarUdaRequest): Promise<UdaValor> {
  return apiPostArr<UdaValor>('/uda', data);
}

export function getHistoricoUda(): Promise<UdaValor[]> {
  return apiGetArr<UdaValor[]>('/uda/historico');
}
