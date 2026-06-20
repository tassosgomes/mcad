import type { PaginationData } from '@/shared/components/ui/pagination/Pagination';

export type StatusUpload = 'Processando' | 'Concluido' | 'ConcluidoComErros' | 'Erro';

export interface Upload {
  id: string;
  captacaoId: string;
  nomeArquivo: string;
  status: StatusUpload;
  totalLinhas: number | null;
  execucoesCriadas: number | null;
  totalErros: number | null;
  mensagemErro: string | null;
  criadoEm: string;
  processadoEm: string | null;
}

export interface ErroUpload {
  linha: number;
  coluna: string;
  mensagem: string;
}

export interface UploadListResponse {
  data: Upload[];
  pagination: PaginationData;
}

export interface ErroUploadListResponse {
  data: ErroUpload[];
  pagination: PaginationData;
}
