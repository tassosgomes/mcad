// ── Enums ──
export type StatusCaptacao = 'ABERTA' | 'FECHADA' | 'CANCELADA';

// ── Entidades ──
export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
  exigeClassificacao: boolean;
}

export interface AnalistaResumo {
  id: string;
  nome: string;
}

export interface ResumoExecucoes {
  total: number;
  identificadas: number;
  pendentes: number;
}

export interface Captacao {
  id: string;
  rubrica: Rubrica;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
  status: StatusCaptacao;
  analistaResponsavel: AnalistaResumo;
  criadoEm: string;         // ISO 8601
  atualizadoEm: string;     // ISO 8601
  distribuicaoProcessada: boolean;
  justificativaCancelamento?: string;
  canceladoEm?: string;     // ISO 8601
}

export interface CaptacaoDetalhe extends Captacao {
  resumoExecucoes: ResumoExecucoes;
}

// ── Requests ──
export interface CriarCaptacaoRequest {
  rubricaId: string;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
}

export interface AtualizarCaptacaoRequest {
  rubricaId: string;
  periodo: string;           // "YYYY-MM-DD"
  usuarioDeMusica: string;
}

// ── Responses ──
export interface CaptacaoListResponse {
  data: Captacao[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

// ── Filtros ──
export interface CaptacaoFiltros {
  page: number;
  size: number;
  sort?: string;
  rubricaId?: string;
  periodoInicio?: string;    // "YYYY-MM-DD"
  periodoFim?: string;       // "YYYY-MM-DD"
  status?: StatusCaptacao;
  analistaResponsavelId?: string;
}
