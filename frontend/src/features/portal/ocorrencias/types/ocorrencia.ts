export type OcorrenciaStatus = 'ABERTA' | 'EM_ANALISE' | 'RESOLVIDA' | 'CANCELADA';

export type OcorrenciaTipo =
  | 'TITULARIDADE_DIVERGENTE'
  | 'FONOGRAMA_INCORRETO'
  | 'DADO_CADASTRAL'
  | 'OBRA_AUSENTE';

export interface Ocorrencia {
  id: string;
  titularId: string;
  tipo: OcorrenciaTipo;
  obraId: string | null;
  fonogramaId: string | null;
  descricao: string;
  status: OcorrenciaStatus;
  resolucao: string | null;
  abertaEm: string;
  resolvidaEm: string | null;
}

export interface CriarOcorrenciaRequest {
  tipo: OcorrenciaTipo;
  obraId?: string | null;
  fonogramaId?: string | null;
  descricao: string;
}

export interface OcorrenciaFiltros {
  status?: OcorrenciaStatus;
}
