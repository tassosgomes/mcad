export interface PreRequisitoItem {
  id: string;
  nome: string;
  atendido: boolean;
  detalhe?: string;
}

export interface ResumoFechamento {
  totalExecucoes: number;
  identificadas: number;
  pendentes: number;
  rubricaNome: string;
  periodo: string; // "YYYY-MM-DD" DateOnly struct return
  exigeClassificacao: boolean;
}

export interface PreRequisitosResponse {
  captacaoId: string;
  todosAtendidos: boolean;
  itens: PreRequisitoItem[];
  resumo: ResumoFechamento;
}

export interface FechamentoResponse {
  captacaoId: string;
  status: string;
  fechadoEm: string;
  totalExecucoes: number;
  sucesso: boolean;
}
