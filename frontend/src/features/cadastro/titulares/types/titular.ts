export type TitularStatus = 'ATIVO' | 'FALECIDO' | 'TRANSFERINDO';
export type TitularTipo = 'PF' | 'PJ';

export interface AssociacaoResumo {
  id: string;
  sigla: string;
  nome: string;
}

export interface Titular {
  id: string;
  nome: string;
  tipo: TitularTipo;
  documento: string;
  documentoFormatado: string;
  nacionalidade: string;
  caeIpi: string | null;
  associacao: AssociacaoResumo;
  status: TitularStatus;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface TitularListResponse {
  data: Titular[];
  pagination: PaginationInfo;
}

export interface CriarTitularRequest {
  nome: string;
  tipo: TitularTipo;
  documento: string;
  nacionalidade: string;
  associacaoId: string;
  caeIpi?: string | null;
}

export interface AtualizarTitularRequest {
  nome: string;
  nacionalidade: string;
  associacaoId: string;
  status: TitularStatus;
  caeIpi?: string | null;
}

export interface TitularFiltros {
  page: number;
  size: number;
  sort: string;
  nome?: string;
  documento?: string;
  associacaoId?: string;
  status?: TitularStatus;
}
