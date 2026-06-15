export type SolicitacaoStatus = 'SOLICITADA' | 'APROVADA' | 'REJEITADA';

export type SolicitacaoCampo = 'NOME' | 'CAE_IPI' | 'ASSOCIACAO' | 'CATEGORIA';

export interface SolicitacaoAlteracao {
  id: string;
  titularId: string;
  titularNome: string;
  campo: SolicitacaoCampo;
  valorAtual: string;
  valorPretendido: string;
  justificativa: string;
  status: SolicitacaoStatus;
  decisaoPor: string | null;
  decididaEm: string | null;
  justificativaRejeicao: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SolicitacaoFiltros {
  page: number;
  size: number;
  sort: string;
  status?: SolicitacaoStatus;
  titularId?: string;
  titularNome?: string;
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface SolicitacaoListResponse {
  data: SolicitacaoAlteracao[];
  pagination: PaginationInfo;
}

export interface AprovarSolicitacaoRequest {
  // body is empty - decision is by authenticated user
}

export interface RejeitarSolicitacaoRequest {
  justificativa: string;
}
