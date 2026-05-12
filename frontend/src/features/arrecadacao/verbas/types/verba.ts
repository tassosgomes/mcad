export type StatusVerba = 'ABERTA' | 'EM_DISTRIBUICAO' | 'DISTRIBUIDA';

export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
}

export interface Verba {
  id: string;
  rubrica: Rubrica;
  periodo: string;
  valorBrutoTotal: string;
  deducaoEcad: string;
  deducaoAssociacoes: string;
  verbaLiquida: string;
  quantidadePagamentos: number;
  status: StatusVerba;
  atualizadoEm: string;
}

export interface VerbaAgregado {
  rubrica: Rubrica;
  valorBrutoTotal: string;
  verbaLiquidaTotal: string;
  quantidadePeriodos: number;
}

export interface VerbasFilter {
  rubricaSigla?: string;
  periodo?: string;
  periodoInicio?: string;
  periodoFim?: string;
  status?: StatusVerba | '';
  page: number;
  size: number;
  sort: string;
}

export interface VerbasAgregadoFilter {
  periodoInicio?: string;
  periodoFim?: string;
  status?: StatusVerba | '';
}

export interface VerbaListResponse {
  data: Verba[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}
