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
  criadoEm: string;
  atualizadoEm: string;
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
