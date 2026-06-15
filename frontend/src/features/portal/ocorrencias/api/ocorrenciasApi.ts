import { portalGet, portalPost } from '../../shared/api/portalClient';
import type { Ocorrencia, CriarOcorrenciaRequest, OcorrenciaFiltros } from '../types/ocorrencia';

export function getOcorrencias(filtros: OcorrenciaFiltros = {}): Promise<Ocorrencia[]> {
  const params = new URLSearchParams();
  if (filtros.status) params.set('status', filtros.status);
  return portalGet<Ocorrencia[]>(`/ocorrencias?${params}`);
}

export function getOcorrenciaById(id: string): Promise<Ocorrencia> {
  return portalGet<Ocorrencia>(`/ocorrencias/${id}`);
}

export function criarOcorrencia(data: CriarOcorrenciaRequest): Promise<Ocorrencia> {
  return portalPost<Ocorrencia>('/ocorrencias', data);
}
