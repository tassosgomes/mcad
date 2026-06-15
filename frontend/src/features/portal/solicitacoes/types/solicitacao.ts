export type SolicitacaoStatus = 'SOLICITADA' | 'APROVADA' | 'REJEITADA';

export type SolicitacaoCampo = 'NOME' | 'CAE_IPI' | 'ASSOCIACAO' | 'CATEGORIA';

export interface SolicitacaoAlteracao {
  id: string;
  titularId: string;
  campo: SolicitacaoCampo;
  valorAtual: string;
  valorPretendido: string;
  justificativa: string;
  status: SolicitacaoStatus;
  justificativaRejeicao: string | null;
  decididaEm: string | null;
}

export interface CriarSolicitacaoRequest {
  campo: SolicitacaoCampo;
  valorPretendido: string;
  justificativa: string;
}
