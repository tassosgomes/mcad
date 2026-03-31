// Feature F04 — Titularidades Autorais
// Exporta apenas o componente composição e hooks para uso externo

export { TitularidadesSection } from './components/TitularidadesSection';

// Hooks (para uso na ObraDetailPage e IswcSection)
export { useTitularidades } from './hooks/useTitularidades';
export { useAddTitularidade } from './hooks/useAddTitularidade';
export { useEditTitularidade } from './hooks/useEditTitularidade';
export { useRemoveTitularidade } from './hooks/useRemoveTitularidade';
export { useBuscarTitulares } from './hooks/useBuscarTitulares';

// Types (para uso no ObraDetailPage)
export type {
  TitularidadeItem,
  TitularResumo,
  TitularidadesResponse,
  CategoriaAutoral,
} from './types/titularidade';
