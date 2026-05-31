import type { ActorDisplayResponse } from '../../shared/types/actor';

export type StatusPagamento = 'CONFIRMADO' | 'ESTORNADO';

export interface LicencaResumo {
  id: string;
  status: string;
  usuarioMusica: { id: string; razaoSocial: string; cnpj: string; };
  rubrica: { id: string; sigla: string; nome: string; };
}

export interface Pagamento {
  id: string;
  licenca: LicencaResumo;
  quantidadeUdas: string;
  valorUdaNoMomento: string;
  valorBruto: string;
  periodo: string;
  status: StatusPagamento;
  dataRegistro: string;
  atualizadoEm: string;
  justificativaEstorno: string | null;
  estornadoPor: string | null;
  estornadoPorAtor?: ActorDisplayResponse | null;
  estornadoEm: string | null;
}

export interface EstornarPagamentoRequest {
  justificativa: string;
}

export interface PagamentoListResponse {
  data: Pagamento[];
  pagination: { page: number; size: number; total: number; totalPages: number; };
}

export interface RegistrarPagamentoRequest {
  licencaId: string;
  quantidadeUdas: string;
}

export interface PagamentoFiltros {
  page: number;
  size: number;
  sort: string;
  usuarioMusicaId?: string;
  razaoSocial?: string;
  rubricaSigla?: string;
  periodo?: string;
  status?: StatusPagamento | '';
}
