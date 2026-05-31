import type { ActorDisplayResponse } from '../../shared/types/actor';

export interface UdaValor {
  id: string;
  valor: string;           // string decimal "107.310000"
  dataVigencia: string;    // ISO date "2026-01-01"
  criadoEm: string;
  criadoPor: string | null; // null for seed
  criadoPorAtor?: ActorDisplayResponse | null;
}

export interface AjustarUdaRequest {
  valor: string;           // string decimal
  dataVigencia: string;    // ISO date
}
