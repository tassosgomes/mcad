export type OcorrenciaStatus = 'ABERTA' | 'EM_ANALISE' | 'RESOLVIDA' | 'CANCELADA';

export type OcorrenciaTipo =
  | 'TITULARIDADE_DIVERGENTE'
  | 'FONOGRAMA_INCORRETO'
  | 'DADO_CADASTRAL'
  | 'OBRA_AUSENTE';

export interface Ocorrencia {
  id: string;
  titularId: string;
  titularNome: string;
  tipo: OcorrenciaTipo;
  obraId: string | null;
  fonogramaId: string | null;
  descricao: string;
  status: OcorrenciaStatus;
  resolucao: string | null;
  justificativaCancelamento: string | null;
  abertaEm: string;
  resolvidaEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface OcorrenciaFiltros {
  page: number;
  size: number;
  sort: string;
  status?: OcorrenciaStatus;
  tipo?: OcorrenciaTipo;
  titularId?: string;
  titularNome?: string;
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface OcorrenciaListResponse {
  data: Ocorrencia[];
  pagination: PaginationInfo;
}

export interface ResolverOcorrenciaRequest {
  resolucao: string;
}

export interface CancelarOcorrenciaRequest {
  justificativa: string;
}
