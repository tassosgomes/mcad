export type OpcaoRecriacao = 'COPIAR_EXECUCOES' | 'RECRIAR_VAZIA' | 'APENAS_CANCELAR';

export interface CancelarRolRequest {
  justificativa: string;
  opcaoRecriacao: OpcaoRecriacao;
}

export interface CancelamentoResponse {
  captacaoCanceladaId: string;
  status: string;
  justificativa: string;
  canceladoEm: string;
  opcaoRecriacao: string;
  novaCaptacaoId?: string;
  execucoesCopiadas?: number;
  eventoPublicado: boolean;
}

export interface PodeCancelarResponse {
  captacaoId: string;
  podeCancelar: boolean;
  motivo?: string;
  distribuicaoProcessada: boolean;
  distribuicaoProcessadaEm?: string;
}
