import type { RuntimeContext } from '@mastra/core/runtime-context';
import type { AiOrchestratorConfig } from '../../config/env.js';
import { createAuditoriaTools } from '../tools/auditoria-tools.js';
import { createCadastroTools } from '../tools/cadastro-tools.js';
import type { LookupResult } from '../tools/tool-results.js';
import { executeWorkflowTool } from './workflow-tool-execution.js';
import type { ExplicarObraInput, ExplicarObraOutput } from './workflow-types.js';

export const explicarObraWorkflowId = 'explicarObraWorkflow';

export async function runExplicarObraWorkflow(
  input: ExplicarObraInput,
  runtimeContext: RuntimeContext,
  config: AiOrchestratorConfig,
): Promise<ExplicarObraOutput> {
  const cadastroTools = createCadastroTools({ config });
  const auditoriaTools = createAuditoriaTools({ config });
  const obra = await executeWorkflowTool<{ termo: string }, LookupResult>(
    cadastroTools.buscarObra,
    'buscarObra',
    { termo: input.termo },
    runtimeContext,
  );
  const obraId = obra.ok ? obra.output.items[0]?.id ?? input.termo : input.termo;

  const [titulares, fonogramas, auditoria] = await Promise.all([
    executeWorkflowTool<{ termo: string }, LookupResult>(
      cadastroTools.buscarTitular,
      'buscarTitular',
      { termo: input.termo },
      runtimeContext,
    ),
    executeWorkflowTool<{ termo: string }, LookupResult>(
      cadastroTools.buscarFonograma,
      'buscarFonograma',
      { termo: input.termo },
      runtimeContext,
    ),
    executeWorkflowTool<{ entityType: string; entityId: string; limit: number }, LookupResult>(
      auditoriaTools.consultarAuditoria,
      'consultarAuditoria',
      { entityType: 'Obra', entityId: obraId, limit: 10 },
      runtimeContext,
    ),
  ]);
  const results = [obra, titulares, fonogramas, auditoria];
  const avisos = results.flatMap((result) => (result.ok ? [] : [result.warning]));

  return {
    resumo: obra.ok
      ? `Obra consultada com ${obra.output.items.length} resultado(s).`
      : 'Nao foi possivel consultar a obra com os dados informados.',
    obra: obra.ok ? obra.output : undefined,
    titulares: titulares.ok ? titulares.output : undefined,
    fonogramas: fonogramas.ok ? fonogramas.output : undefined,
    auditoria: auditoria.ok ? auditoria.output : undefined,
    fontes: results.map((result) => result.source),
    avisos,
  };
}
