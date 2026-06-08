import { apiGetArr, apiPostArr, apiPutArr } from '@services/apiArrecadacaoClient';
import type { Rubrica, CriarRubricaData, AtualizarRubricaData, InativarRubricaData } from '../types/rubrica';

export const listarRubricas = (): Promise<Rubrica[]> =>
  apiGetArr<Rubrica[]>('/rubricas');

export const buscarRubrica = (id: string): Promise<Rubrica> =>
  apiGetArr<Rubrica>(`/rubricas/${id}`);

export const criarRubrica = (data: CriarRubricaData): Promise<Rubrica> =>
  apiPostArr<Rubrica>('/rubricas', data);

export const atualizarRubrica = (id: string, data: AtualizarRubricaData): Promise<Rubrica> =>
  apiPutArr<Rubrica>(`/rubricas/${id}`, data);

export const inativarRubrica = (id: string, data: InativarRubricaData): Promise<Rubrica> =>
  apiPostArr<Rubrica>(`/rubricas/${id}/inativar`, data);

export const ativarRubrica = (id: string, data: InativarRubricaData): Promise<Rubrica> =>
  apiPostArr<Rubrica>(`/rubricas/${id}/ativar`, data);
