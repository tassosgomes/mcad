import type { RuntimeContext } from '@mastra/core/runtime-context';
import type { AiOrchestratorConfig } from '../../config/env.js';
import { createArrecadacaoTools } from '../tools/arrecadacao-tools.js';
import { createDistribuicaoTools } from '../tools/distribuicao-tools.js';
import type { LookupResult } from '../tools/tool-results.js';
import { executeWorkflowTool } from './workflow-tool-execution.js';
import type { ValidarDistribuicaoInput, ValidarDistribuicaoOutput } from './workflow-types.js';

export const validarDistribuicaoWorkflowId = 'validarDistribuicaoWorkflow';

export async function runValidarDistribuicaoWorkflow(
  input: ValidarDistribuicaoInput,
  runtimeContext: RuntimeContext,
  config: AiOrchestratorConfig,
): Promise<ValidarDistribuicaoOutput> {
  const arrecadacaoTools = createArrecadacaoTools({ config });
  const distribuicaoTools = createDistribuicaoTools({ config });

  const [pagamento, processo] = await Promise.all([
    executeWorkflowTool<{ rubricaSigla?: string; periodo?: string }, LookupResult>(
      arrecadacaoTools.consultarPagamento,
      'consultarPagamento',
      { rubricaSigla: input.rubricaSigla, periodo: input.periodo },
      runtimeContext,
    ),
    executeWorkflowTool<{ rubricaSigla?: string; periodo?: string }, LookupResult>(
      distribuicaoTools.consultarProcessoDistribuicao,
      'consultarProcessoDistribuicao',
      { rubricaSigla: input.rubricaSigla, periodo: input.periodo },
      runtimeContext,
    ),
  ]);
  const bloqueios: string[] = [];
  const avisos: string[] = [];

  if (!pagamento.ok) {
    bloqueios.push('Nao foi possivel confirmar pagamento/verba disponivel para a rubrica e periodo.');
    avisos.push(pagamento.warning);
  }

  if (!processo.ok) {
    avisos.push(processo.warning);
  }

  return {
    apto: bloqueios.length === 0,
    bloqueios,
    avisos,
    fontes: [pagamento.source, processo.source],
  };
}
