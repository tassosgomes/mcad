import { apiGetDist } from '@services/apiDistribuicaoClient';
import type { AjusteEstornoDetalhe, AjustesEstornoFiltros, AjustesEstornoPage } from '../types/ajusteEstorno';

function appendParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && value !== '') {
    params.set(key, String(value));
  }
}

export const ajustesEstornoApi = {
  listar: (filtros: AjustesEstornoFiltros): Promise<AjustesEstornoPage> => {
    const params = new URLSearchParams();
    appendParam(params, 'rubrica', filtros.rubrica);
    appendParam(params, 'periodoOrigem', filtros.periodoOrigem);
    if (filtros.status?.length) {
      params.set('status', filtros.status.join(','));
    }
    appendParam(params, 'pagamentoId', filtros.pagamentoId);
    params.set('page', String(filtros.page ?? 1));
    params.set('size', String(filtros.size ?? 20));
    if (filtros.sort) {
      params.set('sort', filtros.sort);
    }
    const queryString = params.toString();
    return apiGetDist<AjustesEstornoPage>(`/ajustes-estorno${queryString ? `?${queryString}` : ''}`);
  },

  buscarPorId: (id: string): Promise<AjusteEstornoDetalhe> => {
    return apiGetDist<AjusteEstornoDetalhe>(`/ajustes-estorno/${id}`);
  },
};
