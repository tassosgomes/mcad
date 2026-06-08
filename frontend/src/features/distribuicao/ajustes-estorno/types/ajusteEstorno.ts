export type AjusteEstornoStatus =
  | 'PENDENTE_APLICACAO'
  | 'PREVISTO'
  | 'APLICADO'
  | 'CANCELADO'
  | 'IGNORADO_SEM_DISTRIBUICAO'
  | 'PROCESSO_CRIADO_DESATUALIZADO'
  | 'ERRO_INTEGRIDADE';

export interface RubricaResumo {
  sigla: string;
  nome: string;
}

export interface AjusteEstornoResumo {
  id: string;
  eventId: string;
  pagamentoId: string;
  licencaId: string;
  rubrica: RubricaResumo;
  periodoOrigem: string;
  valorEstornadoBruto: string;
  valorAjusteLiquido: string;
  valorAplicado: string | null;
  status: AjusteEstornoStatus;
  processoOrigemId: string | null;
  processoAplicacaoId: string | null;
  justificativa: string;
  estornadoPor: string;
  estornadoEm: string;
  recebidoEm: string;
  previstoEm: string | null;
  aplicadoEm: string | null;
}

export interface AjusteEstornoLinha {
  id: string;
  ajusteId: string;
  processoOrigemId: string;
  processoAplicacaoId: string;
  creditoOrigemId: string;
  titularId: string;
  titularNome: string;
  obraId: string;
  obraTitulo: string;
  fonogramaId: string | null;
  categoria: string;
  subcategoriaConexa: string | null;
  valorCreditoOrigem: string;
  valorAjuste: string;
}

export interface AjusteEstornoHistoricoItem {
  status: AjusteEstornoStatus;
  processoId: string | null;
  ocorridoEm: string;
  observacao: string | null;
}

export interface ProcessoResumoLite {
  id: string;
  rubricaSigla: string;
  periodo: string;
  status: string;
}

export interface AjusteEstornoDetalhe extends AjusteEstornoResumo {
  processoOrigem: ProcessoResumoLite | null;
  processoAplicacao: ProcessoResumoLite | null;
  historicoAplicacao: AjusteEstornoHistoricoItem[];
  linhas: AjusteEstornoLinha[];
  payloadOriginal: unknown;
}

export interface AjustesEstornoPage {
  items: AjusteEstornoResumo[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface AjustesEstornoFiltros {
  rubrica?: string;
  periodoOrigem?: string;
  status?: AjusteEstornoStatus[];
  pagamentoId?: string;
  page?: number;
  size?: number;
  sort?: string;
}
