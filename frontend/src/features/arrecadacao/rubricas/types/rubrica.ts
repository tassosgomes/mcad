export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
  exigeClassificacao: boolean;
  ativo: boolean;
}

export interface CriarRubricaData {
  nome: string;
  exigeClassificacao: boolean;
  sigla?: string;
}

export interface AtualizarRubricaData {
  nome: string;
  exigeClassificacao: boolean;
}

export interface InativarRubricaData {
  justificativa: string;
}
