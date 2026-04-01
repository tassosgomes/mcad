// Feature F06 — Participações Conexas
// Public API exports

export { ParticipacoesSection } from './components/ParticipacoesSection';
export { useParticipacoes } from './hooks/useParticipacoes';
export { useAddParticipacao } from './hooks/useAddParticipacao';
export { useAjustarPercentual } from './hooks/useAjustarPercentual';
export { useRemoveParticipacao } from './hooks/useRemoveParticipacao';
export { useCalcularPercentuais } from './hooks/useCalcularPercentuais';
export type {
  ParticipacaoItem,
  ParticipacoesResponse,
  CategoriaConexo,
  AdicionarParticipacaoRequest,
  AjustarPercentualRequest,
} from './types/participacao';
