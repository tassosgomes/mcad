export type StatusProcesso =
  | 'CRIADO'
  | 'CALCULADO'
  | 'APROVADO'
  | 'FINALIZADO'
  | 'CANCELADO';

export interface RubricaResumo {
  sigla: string;
  nome: string;
}

export interface Processo {
  id: string;
  rubrica: RubricaResumo;
  periodo: string;          // YYYY-MM
  status: StatusProcesso;
  verbaLiquida: number;
  totalExecucoes: number | null;
  analistaResponsavel: string;
  criadoEm: string;         // ISO 8601
  calculadoEm: string | null;
  aprovadoEm: string | null;
  finalizadoEm: string | null;
  canceladoEm: string | null;
  justificativaCancelamento: string | null;
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface ProcessoListResponse {
  items: Processo[];
  metadata: PaginationInfo;
}

export interface CriarProcessoRequest {
  rubricaSigla: string;
  periodo: string;
}

export interface CancelarProcessoRequest {
  justificativa: string;
}

export interface Disponibilidade {
  rubrica: RubricaResumo;
  periodo: string;
  verbaLiquida: number;
  totalExecucoes: number;
}

export interface ProcessoFiltros {
  page: number;
  size: number;
  rubrica?: string;
  periodo?: string;
  status?: string;  // "CRIADO,CALCULADO" (multi-value CSV)
  sort: string;
}
