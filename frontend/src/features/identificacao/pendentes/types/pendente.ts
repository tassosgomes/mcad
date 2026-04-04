export interface ExecucaoPendente {
  id: string;
  captacaoId: string;
  captacaoRubrica: string;
  captacaoPeriodo: string; // ISO date
  captacaoStatus?: string;
  captacaoAnalistaResponsavel: string;
  obraId?: string | null;
  fonogramaId?: string | null;
  obraTitulo?: string;
  fonogramaIsrc?: string | null;
  obraIswc?: string | null;
  interpretes?: string;
  inicio?: string;
  fim?: string;
  quantidade?: number;
  status: 'PENDENTE' | 'IDENTIFICADA';
  criadoEm: string; // ISO date-time
}

export interface ImpactoPendente {
  identificador: string;
  tipoIdentificador: 'isrc' | 'iswc' | 'desconhecido';
  obraTitulo?: string | null;
  totalExecucoes: number;
  totalCaptacoes: number;
  captacoes?: {
    captacaoId: string;
    rubrica: string;
    periodo: string;
    execucoesPendentes: number;
  }[];
}

export interface ResolverPendenteRequest {
  obraId: string;
  fonogramaId?: string | null;
}

export interface ResolverLoteRequest {
  execucaoIds: string[];
  obraId: string;
  fonogramaId?: string | null;
}

export interface ResolverLoteResponse {
  resolvidas: number;
  rejeitadas: number;
  detalhesRejeitadas: {
    execucaoId: string;
    motivo: string;
  }[];
}

export interface PendenteListResponse {
  data: ExecucaoPendente[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface ImpactoPendenteListResponse {
  data: ImpactoPendente[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface PendenteListFilters {
  page?: number;
  size?: number;
  captacaoId?: string;
  rubricaId?: string;
  periodoInicio?: string;
  periodoFim?: string;
  q?: string;
  sort?: string;
}

export interface ImpactoPendenteFilters {
  page?: number;
  size?: number;
  sort?: string;
}
