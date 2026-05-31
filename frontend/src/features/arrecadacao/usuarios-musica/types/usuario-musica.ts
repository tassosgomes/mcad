import type { ActorDisplayResponse } from '../../shared/types/actor';

export type StatusUsuarioMusica = 'ATIVO' | 'INATIVO';

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface Contato {
  nomeResponsavel: string;
  telefone: string | null;
  email: string | null;
}

export interface UsuarioMusica {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  cnpjFormatado: string;
  endereco: Endereco;
  contato: Contato;
  status: StatusUsuarioMusica;
  criadoEm: string;
  atualizadoEm: string | null;
}

export interface UsuarioMusicaListResponse {
  data: UsuarioMusica[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface CriarUsuarioMusicaRequest {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  endereco: Endereco;
  contato: Contato;
}

export interface AtualizarUsuarioMusicaRequest {
  razaoSocial: string;
  nomeFantasia?: string | null;
  endereco: Endereco;
  contato: Contato;
}

export interface AlterarStatusUsuarioMusicaRequest {
  justificativa: string;
}

export interface HistoricoStatusUsuarioMusica {
  id: string;
  statusAnterior: StatusUsuarioMusica | null;
  statusNovo: StatusUsuarioMusica;
  justificativa: string;
  autor: string;
  ator?: ActorDisplayResponse | null;
  data: string;
}

export interface UsuarioMusicaFiltros {
  page: number;
  size: number;
  sort: string;
  razaoSocial?: string;
  cnpj?: string;
  status?: StatusUsuarioMusica | '';
  cidade?: string;
}
