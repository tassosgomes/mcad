// Feature F04 — Titularidades Autorais
// Tipos derivados do API Contract: tasks/prd-titularidades-autorais/api-contract.yaml

export type CategoriaAutoral = 'AUTOR' | 'EDITOR';

export interface TitularResumo {
  id: string;
  codigo: number;
  nome: string;
  tipo: 'PF' | 'PJ';
  documentoFormatado: string;
  associacaoSigla?: string;
}

export interface TitularidadeItem {
  id: string;
  titular: TitularResumo;
  categoria: CategoriaAutoral;
  percentual: number;
}

export interface TitularidadesResponse {
  obraId: string;
  titularidades: TitularidadeItem[];
  somaPercentual: number;
  somaCompleta: boolean;
}

export interface AdicionarTitularidadeRequest {
  titularId: string;
  categoria: CategoriaAutoral;
  percentual: number;
}

export interface EditarTitularidadeRequest {
  percentual: number;
}
