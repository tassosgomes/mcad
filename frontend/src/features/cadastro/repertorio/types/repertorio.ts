export type WizardStep = 'obra' | 'titulares' | 'fonogramas' | 'revisao';

export const WIZARD_STEPS: WizardStep[] = ['obra', 'titulares', 'fonogramas', 'revisao'];

export type TipoObraRepertorio = 'MUSICAL' | 'LITEROMUSICAL' | 'VERSAO' | 'POT_POURRI';
export type TipoTitularRepertorio = 'PF' | 'PJ';
export type CategoriaAutoralRepertorio = 'AUTOR' | 'EDITOR';
export type CategoriaConexoRepertorio = 'INTERPRETE' | 'PRODUTOR_FONOGRAFICO' | 'MUSICO_EXECUTANTE';

export interface DadosObraRepertorio {
  titulo: string;
  subtitulo?: string | null;
  tipo: TipoObraRepertorio;
  genero?: string | null;
}

export interface NovoTitularRepertorioInput {
  nome: string;
  tipoPessoa: TipoTitularRepertorio;
  documento: string;
  nacionalidade: string;
  associacaoId: string;
  caeIpi?: string | null;
}

export interface TitularRepertorioInput {
  titularId?: string | null;
  novoTitular?: NovoTitularRepertorioInput | null;
}

export interface TitularidadeRepertorioInput {
  titularLocalKey: string;
  categoria: CategoriaAutoralRepertorio;
  percentual: number;
}

export interface ParticipacaoRepertorioInput {
  titularLocalKey: string;
  papel: CategoriaConexoRepertorio;
}

export interface FonogramaRepertorioInput {
  isrc: string;
  pais: string;
  dataGravacao?: string | null;
  dataLancamento?: string | null;
  urlAudio?: string | null;
  participacoes: ParticipacaoRepertorioInput[];
}

export interface RegistrarRepertorioCommand {
  obra: DadosObraRepertorio;
  titulares: TitularRepertorioInput[];
  titularidades: TitularidadeRepertorioInput[];
  fonogramas: FonogramaRepertorioInput[];
}

export interface FonogramaRepertorioResponse {
  id: string;
  isrc: string;
  status: string;
  link: string;
}

export interface TitularCriadoResponse {
  id: string;
  nome: string;
  tipo: string;
  documentoFormatado: string;
  associacao: string;
}

export interface CadastroRepertorioResponse {
  obraId: string;
  obraTitulo: string;
  statusObra: string;
  iswc?: string | null;
  fonogramas: FonogramaRepertorioResponse[];
  titularesCriados: TitularCriadoResponse[];
  iswcObtido: boolean;
  obraLink: string;
  fonogramaLinks: string[];
}

export interface TitularResumoResponse {
  id: string;
  nome: string;
  tipo: string;
  documentoFormatado: string;
  associacao: string;
}

export interface ProblemDetailsWithCode {
  status: number;
  title: string;
  detail?: string;
  instance?: string;
  code?: string;
}

export interface WizardState {
  step: WizardStep;
  obra: DadosObraRepertorio | null;
  titulares: TitularRepertorioInput[];
  titularidades: TitularidadeRepertorioInput[];
  fonogramas: FonogramaRepertorioInput[];
  iswcFalhou: boolean;
  resultado: CadastroRepertorioResponse | null;
  erros: Record<string, string[]>;
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_OBRA'; obra: DadosObraRepertorio }
  | { type: 'SET_TITULARES'; titulares: TitularRepertorioInput[] }
  | { type: 'SET_TITULARIDADES'; titularidades: TitularidadeRepertorioInput[] }
  | { type: 'SET_FONOGRAMAS'; fonogramas: FonogramaRepertorioInput[] }
  | { type: 'SET_ISWC_FALHOU'; falhou: boolean }
  | { type: 'SET_RESULTADO'; resultado: CadastroRepertorioResponse }
  | { type: 'SET_ERROS'; erros: Record<string, string[]> }
  | { type: 'RESET' };

export function wizardInitialState(): WizardState {
  return {
    step: 'obra',
    obra: null,
    titulares: [],
    titularidades: [],
    fonogramas: [],
    iswcFalhou: false,
    resultado: null,
    erros: {},
  };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_OBRA':
      return { ...state, obra: action.obra };
    case 'SET_TITULARES':
      return { ...state, titulares: action.titulares };
    case 'SET_TITULARIDADES':
      return { ...state, titularidades: action.titularidades };
    case 'SET_FONOGRAMAS':
      return { ...state, fonogramas: action.fonogramas };
    case 'SET_ISWC_FALHOU':
      return { ...state, iswcFalhou: action.falhou };
    case 'SET_RESULTADO':
      return { ...state, resultado: action.resultado };
    case 'SET_ERROS':
      return { ...state, erros: action.erros };
    case 'RESET':
      return wizardInitialState();
    default:
      return state;
  }
}

export function isRepertorioComplete(state: WizardState): boolean {
  return (
    state.obra !== null &&
    state.titularidades.length > 0 &&
    state.fonogramas.length > 0
  );
}

export function buildRepertorioCommand(state: WizardState): RegistrarRepertorioCommand | null {
  if (!isRepertorioComplete(state)) return null;
  return {
    obra: state.obra!,
    titulares: state.titulares,
    titularidades: state.titularidades,
    fonogramas: state.fonogramas,
  };
}
