export interface Fonograma {
  id: string;
  isrc: {
    valor: string;
    formatado?: string;
  };
  isrcFormatado: string;
  obra?: {
    id: string;
    titulo: string;
  };
  paisOrigem: string;
  dataGravacao?: string;
  dataLancamento?: string;
  urlAudio?: string | null;
  bloqueioJustificativa?: string | null;
  status: 'Pendente_Validacao' | 'PENDENTE_VALIDACAO' | 'Pendente_Documentacao' | 'PENDENTE_DOCUMENTACAO' | 'Liberado' | 'LIBERADO' | 'Bloqueado' | 'BLOQUEADO' | 'Depurado' | 'DEPURADO';
  fonogramaDepuradoParaId?: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface FonogramaFiltros {
  page: number;
  size: number;
  sort?: string;
  isrc?: string;
  obraId?: string;
  obraTitulo?: string;
  status?: string;
  pais?: string;
}

export interface FonogramaListResponse {
  data: FonogramaResumo[];
  page: number;
  size: number;
  totalPages: number;
  totalRecords: number;
}

export interface FonogramaResumo {
  id: string;
  isrcFormatado: string;
  status: 'Pendente_Validacao' | 'Pendente_Documentacao' | 'Liberado' | 'Depurado';
  paisOrigem: string;
  dataLancamento?: string;
  obra?: {
    id: string;
    titulo: string;
  };
}

export interface CriarFonogramaRequest {
  isrc: string;
  obraId: string;
  paisOrigem: string;
  dataGravacao?: string;
  dataLancamento?: string;
}

export interface AtualizarFonogramaRequest {
  isrc: string;
  paisOrigem: string;
  dataGravacao?: string;
  dataLancamento?: string;
}

export interface DepurarFonogramaRequest {
  isrc: string;
  paisOrigem: string;
  dataGravacao?: string;
  dataLancamento?: string;
}

export interface DepuracaoFonogramaResponse {
  fonogramaOriginalId: string;
  novoFonogramaId: string;
  novoIsrcFormatado: string;
}
