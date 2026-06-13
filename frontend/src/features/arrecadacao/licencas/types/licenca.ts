import type { ActorDisplayResponse } from '../../shared/types/actor';

export type StatusLicenca = 'ATIVA' | 'SUSPENSA' | 'ENCERRADA';

export interface UsuarioMusicaResumo {
  id: string;
  razaoSocial: string;
  cnpj: string;
}

export interface RubricaResumo {
  id: string;
  sigla: string;
  nome: string;
}

export interface Licenca {
  id: string;
  usuarioMusica: UsuarioMusicaResumo;
  rubrica: RubricaResumo;
  dataInicio: string;      // ISO date "2026-04-01"
  dataFim: string | null;  // null = indefinida
  status: StatusLicenca;
  criadoEm: string;        // ISO datetime
  atualizadoEm: string;
}

export interface LicencaListResponse {
  data: Licenca[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CriarLicencaRequest {
  usuarioMusicaId: string;
  rubricaId: string;
  dataInicio: string;
  dataFim?: string | null;
}

export interface TransicaoStatusRequest {
  justificativa: string;
}

export interface HistoricoStatusLicenca {
  id: string;
  statusAnterior: StatusLicenca | null;
  statusNovo: StatusLicenca;
  justificativa: string;
  autor: string;
  ator?: ActorDisplayResponse | null;
  data: string;
}

export interface LicencaFiltros {
  page: number;
  size: number;
  sort: string;
  usuarioMusicaId?: string;
  razaoSocial?: string;
  rubricaSigla?: string;
  status?: StatusLicenca | '';
  vigente?: boolean;
}
