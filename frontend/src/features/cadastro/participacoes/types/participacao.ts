// Feature F06 — Participações Conexas
// Tipos derivados do API Contract: tasks/prd-participacao-conexa/api-contract.yaml

export type CategoriaConexo = 'INTERPRETE' | 'PRODUTOR_FONOGRAFICO' | 'MUSICO_EXECUTANTE';

export interface TitularResumo {
  id: string;
  nome: string;
  tipo: 'PF' | 'PJ';
  documentoFormatado: string;
  associacaoSigla?: string;
}

export interface ParticipacaoItem {
  id: string;
  titular: TitularResumo;
  categoria: CategoriaConexo;
  /** Percentual com 4 casas decimais. null enquanto não calculado. */
  percentual: number | null;
  /** true para Intérprete/Produtor; false para Músico (não editável manualmente) */
  editavel: boolean;
}

export interface ParticipacoesResponse {
  fonogramaId: string;
  participacoes: ParticipacaoItem[];
  /** Soma dos percentuais. null se algum percentual for null. */
  somaPercentual: number | null;
  /** true se todos os percentuais foram calculados */
  somaCalculada: boolean;
  /** true se a composição mudou após o último cálculo */
  percentuaisDesatualizados: boolean;
}

export interface AdicionarParticipacaoRequest {
  titularId: string;
  categoria: CategoriaConexo;
}

export interface AjustarPercentualRequest {
  percentual: number;
}

export const CATEGORIA_LABELS: Record<CategoriaConexo, string> = {
  INTERPRETE: 'Intérprete',
  PRODUTOR_FONOGRAFICO: 'Produtor Fonográfico',
  MUSICO_EXECUTANTE: 'Músico Executante',
};
