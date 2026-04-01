export type ObraTipo = 'MUSICAL' | 'LITEROMUSICAL' | 'VERSAO' | 'POT_POURRI';
export type ObraStatus = 'PENDENTE' | 'LIBERADO' | 'BLOQUEADO' | 'DOMINIO_PUBLICO' | 'DEPURADA';

export interface ObraMusical {
  id: string; // uuid
  titulo: string;
  subtitulo: string | null;
  tipo: ObraTipo;
  genero: string | null;
  iswc: string | null;
  status: ObraStatus;
  dominioPublico: boolean;
  obraDepuradaParaId: string | null;
  bloqueioJustificativa?: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface PreRequisitoItem {
  item: string;
  atendido: boolean;
  detalhe?: string | null;
}

export interface PreRequisitosError {
  type: string;
  title: string;
  status: 422;
  detail: string;
  pendencias: PreRequisitoItem[];
}

export interface HistoricoBloqueioItem {
  id: string;
  acao: 'BLOQUEIO' | 'DESBLOQUEIO';
  justificativa: string | null;
  dataHora: string;
}

export interface BloquearRequest {
  justificativa: string;
}

export interface CriarObraRequest {
  titulo: string;
  subtitulo?: string | null;
  tipo: ObraTipo;
  genero?: string | null;
}

export interface AtualizarObraRequest {
  titulo: string;
  subtitulo?: string | null;
  tipo: ObraTipo;
  genero?: string | null;
}

export interface DepurarObraRequest {
  titulo: string;
  subtitulo?: string | null;
  tipo: ObraTipo;
  genero?: string | null;
}

export interface DepuracaoResponse {
  obraDepurada: ObraMusical;
  novaObra: ObraMusical;
}

export interface DominioPublicoRequest {
  dominioPublico: boolean;
}

export interface ObraFiltros {
  page: number;
  size: number;
  sort?: string;
  titulo?: string;
  iswc?: string;
  tipo?: ObraTipo;
  status?: ObraStatus;
  genero?: string;
}

export interface ObraListResponse {
  data: ObraMusical[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}
