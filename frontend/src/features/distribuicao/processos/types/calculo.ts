export type StatusProcesso = 'CRIADO' | 'CALCULADO' | 'APROVADO' | 'CANCELADO';

export type CategoriaCredito = 'AUTORAL' | 'CONEXO';

export type SubcategoriaConexa = 'INTERPRETE' | 'PRODUTOR' | 'MUSICO';

export type StatusCredito = 'CALCULADO' | 'RETIDO';

export type MotivoRetencao =
  | 'OBRA_PENDENTE'
  | 'OBRA_BLOQUEADA'
  | 'TITULAR_SEM_ASSOCIACAO';

export interface CalculoProcessoResumo {
  verbaLiquida: string;
  totalExecucoes: number | null;
  totalPontos: string | null;
  totalObras: number | null;
  totalCreditos: number | null;
  valorTotalCalculado: string | null;
  totalCreditosRetidos: number | null;
  valorTotalRetido: string | null;
  calculadoEm: string | null;
}

export interface CreditoCalculo {
  id: string;
  titularId: string;
  titularNome: string;
  obraId: string;
  obraTitulo: string;
  fonogramaId: string | null;
  categoria: CategoriaCredito;
  subcategoriaConexa: SubcategoriaConexa | null;
  percentualAplicado: string;
  valorObra: string;
  valorCredito: string;
  pontosObra: string;
  status: StatusCredito;
  motivoRetencao: MotivoRetencao | null;
  retidoEm: string | null;
  criadoEm: string;
}

export interface PaginationMetadata {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CreditosPaginados {
  items: CreditoCalculo[];
  metadata: PaginationMetadata;
}

export interface CalculoProcessoResponse {
  processoId: string;
  status: StatusProcesso;
  rubricaSigla: string;
  periodo: string;
  resumo: CalculoProcessoResumo;
  creditos: CreditosPaginados;
}

export interface CalcularProcessoResponse {
  processoId: string;
  status: StatusProcesso;
  rubricaSigla: string;
  periodo: string;
  verbaLiquida: string;
  totalExecucoes: number;
  totalObras: number;
  totalPontos: string;
  totalCreditos: number;
  valorTotalCalculado: string;
  totalCreditosRetidos: number;
  valorTotalRetido: string;
  calculadoEm: string;
}

export interface CalculoProcessoFilters {
  page?: number;
  size?: number;
  categoria?: CategoriaCredito | '';
  titularId?: string;
  obraId?: string;
  status?: StatusCredito | '';
  motivoRetencao?: MotivoRetencao | '';
}

export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
}
