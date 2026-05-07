import { apiGetDist } from '@services/apiDistribuicaoClient';
import type { Rubrica } from '../types/rubrica';

export function listarRubricas(): Promise<Rubrica[]> {
  return apiGetDist<Rubrica[]>('/rubricas');
}
