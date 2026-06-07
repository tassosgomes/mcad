export interface TitularDemonstrativoResumo {
  titularId: string;
  titularNome: string;
  totalCalculado: string;
  totalRetido: string;
  totalLiberado: string;
  totalAReceber: string;
  quantidadeObras: number;
}

export interface TitularesDemonstrativoPage {
  items: TitularDemonstrativoResumo[];
  metadata: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

export interface ResumoFinanceiro {
  totalAReceber: string;
  totalCalculado: string;
  totalRetido: string;
  totalLiberado: string;
  totalAjustesEstorno: string;
}

export interface CreditoCalculado {
  obraId: string;
  obraNome: string;
  fonogramaId: string | null;
  fonogramaNome: string | null;
  categoria: string | null;
  subcategoria: string | null;
  percentual: string;
  valorObra: string;
  valorCredito: string;
}

export interface CreditoRetido {
  obraId: string;
  obraNome: string;
  fonogramaId: string | null;
  fonogramaNome: string | null;
  categoria: string | null;
  motivoRetencao: string | null;
  valorCredito: string;
  retidoEm: string | null;
}

export interface CreditoLiberado {
  obraId: string;
  obraNome: string;
  fonogramaId: string | null;
  fonogramaNome: string | null;
  categoria: string | null;
  processoOrigemId: string;
  motivoOriginal: string | null;
  valorCredito: string;
  liberadoEm: string | null;
}

export interface DemonstrativoTitular {
  processoId: string;
  statusProcesso: string;
  rubricaSigla: string;
  periodo: string;
  titularId: string;
  titularNome: string;
  resumo: ResumoFinanceiro;
  creditosPeriodo: CreditoCalculado[];
  creditosRetidos: CreditoRetido[];
  creditosLiberados: CreditoLiberado[];
  ajustesEstorno: unknown[];
  totalAjustesEstorno: string;
}

export interface ListarTitularesParams {
  titularNome?: string;
  page?: number;
  size?: number;
  sort?: 'nome' | 'totalAReceber';
}
