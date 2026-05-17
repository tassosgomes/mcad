import { apiGetDist, apiPostDist } from '@services/apiDistribuicaoClient';
import type {
  CalcularProcessoResponse,
  CalculoProcessoFilters,
  CalculoProcessoResponse,
} from '../types/calculo';

function appendParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') {
    params.set(key, String(value));
  }
}

export function consultarCalculoProcesso(
  processoId: string,
  filters: CalculoProcessoFilters = {},
): Promise<CalculoProcessoResponse> {
  const params = new URLSearchParams();
  appendParam(params, 'page', filters.page);
  appendParam(params, 'size', filters.size);
  appendParam(params, 'categoria', filters.categoria);
  appendParam(params, 'titularId', filters.titularId);
  appendParam(params, 'obraId', filters.obraId);
  appendParam(params, 'status', filters.status);
  appendParam(params, 'motivoRetencao', filters.motivoRetencao);

  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';

  return apiGetDist<CalculoProcessoResponse>(`/processos/${processoId}/calculo${suffix}`);
}

export function calcularProcesso(processoId: string): Promise<CalcularProcessoResponse> {
  return apiPostDist<CalcularProcessoResponse>(`/processos/${processoId}/calcular`);
}
