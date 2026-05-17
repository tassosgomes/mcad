export type StatusProcesso =
  | 'CRIADO'
  | 'CALCULADO'
  | 'APROVADO'
  | 'FINALIZADO'
  | 'CANCELADO';

export type CategoriaCredito = 'AUTORAL' | 'CONEXO';

export type SubcategoriaConexa = 'INTERPRETE' | 'PRODUTOR' | 'MUSICO';

export type StatusCredito = 'CALCULADO' | 'RETIDO' | 'LIBERADO';

export type StatusLiberacaoCredito = 'PREVISTA' | 'EFETIVADA' | 'CANCELADA';

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
  totalCreditosRetidosLiberados: number | null;
  valorTotalRetidosLiberados: string | null;
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
  liberadoEm: string | null;
  processoLiberacaoId: string | null;
  criadoEm: string;
}

export interface RetidoLiberadoItem {
  liberacaoId: string;
  creditoId: string;
  processoOrigemId: string;
  processoLiberacaoId: string;
  periodoOrigem: string;
  status: StatusLiberacaoCredito;
  titularId: string;
  titularNome: string;
  obraId: string;
  obraTitulo: string;
  fonogramaId: string | null;
  categoria: CategoriaCredito;
  subcategoriaConexa: SubcategoriaConexa | null;
  valorLiberado: string;
  motivoRetencaoOriginal: MotivoRetencao;
  retidoEm: string;
  avaliadoEm: string;
  efetivadoEm: string | null;
}

export interface RetidosLiberadosResponse {
  items: RetidoLiberadoItem[];
  total: number;
  valorTotal: string;
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
  retidosLiberados: RetidosLiberadosResponse;
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
  totalCreditosRetidosLiberados: number;
  valorTotalRetidosLiberados: string;
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
