import { apiGet, apiDelete, apiUpload } from '@services/apiClient';
import type { Anexo, CategoriaAnexo, DownloadUrlResponse, TipoEntidadeAnexo } from '../types/anexo';

function basePath(tipo: TipoEntidadeAnexo, entidadeId: string) {
  const segmento = tipo === 'Obra' ? 'obras' : tipo === 'Fonograma' ? 'fonogramas' : 'titulares';
  return `/${segmento}/${entidadeId}/anexos`;
}

export function getAnexos(tipo: TipoEntidadeAnexo, entidadeId: string): Promise<Anexo[]> {
  return apiGet<Anexo[]>(basePath(tipo, entidadeId));
}

export function getAnexo(tipo: TipoEntidadeAnexo, entidadeId: string, anexoId: string): Promise<Anexo> {
  return apiGet<Anexo>(`${basePath(tipo, entidadeId)}/${anexoId}`);
}

export function getDownloadUrl(tipo: TipoEntidadeAnexo, entidadeId: string, anexoId: string): Promise<DownloadUrlResponse> {
  return apiGet<DownloadUrlResponse>(`${basePath(tipo, entidadeId)}/${anexoId}/download`);
}

export function uploadAnexo(
  tipo: TipoEntidadeAnexo,
  entidadeId: string,
  arquivo: File,
  categoria: CategoriaAnexo,
): Promise<Anexo> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  form.append('categoria', categoria);
  return apiUpload<Anexo>(basePath(tipo, entidadeId), form);
}

export function removerAnexo(tipo: TipoEntidadeAnexo, entidadeId: string, anexoId: string): Promise<void> {
  return apiDelete(`${basePath(tipo, entidadeId)}/${anexoId}`);
}
