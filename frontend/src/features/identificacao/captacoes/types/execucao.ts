export interface TipoUtilizacao {
  id: string;
  sigla: string;
  descricao: string;
  peso: number;
}

export interface Execucao {
  id: string;
  obraId: string;
  fonogramaId: string | null;
  obraTitulo: string;
  fonogramaIsrc: string | null;
  obraIswc: string | null;
  interpretes: string;
  inicio: string; // HH:mm:ss
  fim: string;    // HH:mm:ss
  duracaoSegundos: number;
  quantidade: number;
  tipoUtilizacao: TipoUtilizacao | null;
  tituloPrograma: string | null;
  status: 'Pendente' | 'Identificada';
}

export interface ListarExecucoesResponse {
  items: Execucao[];
  total: number;
}

export interface CriarExecucaoRequest {
  obraId: string;
  fonogramaId: string | null;
  inicio: string; // HH:mm:ss
  fim: string;    // HH:mm:ss
  quantidade: number;
  tipoUtilizacaoId: string | null;
  tituloPrograma: string | null;
}

export interface AtualizarExecucaoRequest {
  obraId: string;
  fonogramaId: string | null;
  inicio: string; // HH:mm:ss
  fim: string;    // HH:mm:ss
  quantidade: number;
  tipoUtilizacaoId: string | null;
  tituloPrograma: string | null;
}

export interface FiltrosExecucao {
  page?: number;
  size?: number;
  status?: string;
  sort?: string;
}

// Interfaces relativas ao Cadastro / unified search
export interface ResultadoBusca {
  id: string;
  tipo: 'obra' | 'fonograma';
  titulo: string;
  codigoIdentificador: string | null; // ISWC ou ISRC
  autoresOuInterpretes: string;
  status: string;
  obraId: string; // no caso de fonograma, o id da obra vinculada
}

export interface BuscaCadastroResponse {
  resultados: ResultadoBusca[];
}

export interface ObraFonogramaSelecionado {
  obraId: string;
  fonogramaId: string | null;
  titulo: string;
}

// Interfaces criacao pendente (requisitos de outras tasks)
export interface CriarObraPendenteRequest {
  titulo: string;
  tipo: string;
}

export interface CriarObraPendenteResponse {
  id: string;
  titulo: string;
}

export interface CriarFonogramaPendenteRequest {
  obraId: string;
  isrc?: string | null;
}

export interface CriarFonogramaPendenteResponse {
  id: string;
  isrc: string | null;
}
