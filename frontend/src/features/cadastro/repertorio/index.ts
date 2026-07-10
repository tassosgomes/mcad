export { CadastroRepertorioPage } from './pages/CadastroRepertorioPage';
export {
  useBuscarTitularPorDocumento,
  useRegistrarRepertorio,
  useRegistrarRepertorioPendente,
} from './hooks/useCadastroRepertorio';
export {
  wizardInitialState,
  wizardReducer,
  isRepertorioComplete,
  buildRepertorioCommand,
  WIZARD_STEPS,
} from './types/repertorio';
export type {
  WizardStep,
  WizardState,
  WizardAction,
  DadosObraRepertorio,
  TitularRepertorioInput,
  NovoTitularRepertorioInput,
  TitularidadeRepertorioInput,
  FonogramaRepertorioInput,
  ParticipacaoRepertorioInput,
  RegistrarRepertorioCommand,
  CadastroRepertorioResponse,
  FonogramaRepertorioResponse,
  TitularCriadoResponse,
  TitularResumoResponse,
  ProblemDetailsWithCode,
  TipoObraRepertorio,
  TipoTitularRepertorio,
  CategoriaAutoralRepertorio,
  CategoriaConexoRepertorio,
} from './types/repertorio';
export { isIswcIndisponivel } from './api/repertorioApi';
