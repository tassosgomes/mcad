export type OpcaoRecriacao = 'COPIAR_EXECUCOES' | 'RECRIAR_VAZIA' | 'APENAS_CANCELAR';

export interface CancelarRolRequest {
  justificativa: string;
  opcaoRecriacao: OpcaoRecriacao;
}

export interface CancelamentoResponse {
  captacaoId: string;
  status: string;
  justificativa: string;
  canceladoEm: string; // ISO 8601
  opcaoRecriacao: string;
  novaCaptacaoId?: string;
  execucoesCopiadas?: number;
  sucesso: boolean;
}

export interface PodeCancelarResponse {
  captacaoId: string;
  podeCancelar: boolean;
  motivoBloqueio?: string;
  distribuicaoProcessada: boolean;
  distribuicaoProcessadaEm?: string; // ISO 8601
}
