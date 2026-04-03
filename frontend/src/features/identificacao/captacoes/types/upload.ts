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
  id: string;
  linha: number | null;
  coluna: string;
  mensagem: string;
}

export interface UploadListResponse {
  items: Upload[];
  total: number;
}

export interface ErroUploadListResponse {
  items: ErroUpload[];
  total: number;
}
