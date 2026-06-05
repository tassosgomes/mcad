import { bffGet } from '@services/apiBffClient';

export interface DashboardAlerta {
  tipo: 'info' | 'warning' | 'error';
  mensagem: string;
}

export interface CadastroResumo {
  totalObras: number;
  totalFonogramas: number;
  totalTitulares: number;
  totalAssociacoes: number;
  alertas: DashboardAlerta[];
}

export interface IdentificacaoResumo {
  taxaMatch: number;
  totalPendentes: number;
  captacoesAtivas: number;
  ultimoLoteDescricao: string | null;
  alertas: DashboardAlerta[];
}

export interface ArrecadacaoResumo {
  arrecadacaoMes: number;
  totalLicencasAtivas: number;
  totalLicencasSuspensas: number;
  verbaLiquidaEstimada: number;
  alertas: DashboardAlerta[];
}

export interface DistribuicaoResumo {
  statusUltimoCiclo: string;
  totalRepassado: number;
  creditosRetidos: number;
  rubricasAtivas: number;
  alertas: DashboardAlerta[];
}

export interface DashboardSummary {
  cadastro?: CadastroResumo | null;
  identificacao?: IdentificacaoResumo | null;
  arrecadacao?: ArrecadacaoResumo | null;
  distribuicao?: DistribuicaoResumo | null;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return bffGet<DashboardSummary>('/me/dashboard');
}
