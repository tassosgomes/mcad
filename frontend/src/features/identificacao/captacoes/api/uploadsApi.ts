import { apiGetIden, fetchWithAuth, BASE_URL } from '@/shared/services/apiIdentificacaoClient';
import { Upload, UploadListResponse, ErroUploadListResponse } from '../types/upload';

export async function getUploads(captacaoId: string, page = 1, size = 10): Promise<UploadListResponse> {
  return await apiGetIden<UploadListResponse>(`/captacoes/${captacaoId}/uploads?page=${page}&size=${size}`);
}

export async function getUploadById(captacaoId: string, uploadId: string): Promise<Upload> {
  return await apiGetIden<Upload>(`/captacoes/${captacaoId}/uploads/${uploadId}`);
}

export async function getErrosUpload(captacaoId: string, uploadId: string, page = 1, size = 10): Promise<ErroUploadListResponse> {
  return await apiGetIden<ErroUploadListResponse>(`/captacoes/${captacaoId}/uploads/${uploadId}/erros?page=${page}&size=${size}`);
}

export async function uploadCsv(captacaoId: string, arquivo: File): Promise<Upload> {
  const formData = new FormData();
  formData.append('arquivo', arquivo);

  const response = await fetchWithAuth(`${BASE_URL}/captacoes/${captacaoId}/uploads`, {
    method: 'POST',
    body: formData, // No Content-Type, so browser sets boundary
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({ detail: 'Erro ao fazer upload' }));
    throw problem;
  }
  return response.json();
}
