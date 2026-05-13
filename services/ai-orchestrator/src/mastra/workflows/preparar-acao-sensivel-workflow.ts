import type { PrepararAcaoSensivelInput, PrepararAcaoSensivelOutput } from './workflow-types.js';

export const prepararAcaoSensivelWorkflowId = 'prepararAcaoSensivelWorkflow';
export const prepararAcaoSensivelApprovalStepId = 'aguardar-aprovacao-humana';

export function runPrepararAcaoSensivelWorkflow(input: PrepararAcaoSensivelInput): PrepararAcaoSensivelOutput {
  const entidade = input.entidadeTipo && input.entidadeId
    ? ` para ${input.entidadeTipo} ${input.entidadeId}`
    : '';

  return {
    proposta: `Proposta preparada${entidade}: ${input.intencao}. Nenhuma escrita foi executada.`,
    requerAprovacao: true,
    escritaExecutada: false,
  };
}
