import { apiGet } from '@services/apiClient';
import type { Associacao } from '../types/associacao';

export function getAssociacoes(): Promise<Associacao[]> {
  return apiGet<Associacao[]>('/associacoes');
}
