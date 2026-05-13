import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ToolFactoryContext } from './tool-helpers.js';
import { getToolJson, requireToolPermission, toLookupItems } from './tool-helpers.js';
import { lookupResultSchema, successSource } from './tool-results.js';

export function createDistribuicaoTools({ config }: ToolFactoryContext) {
  const consultarProcessoDistribuicao = createTool({
    id: 'consultarProcessoDistribuicao',
    description: 'Consulta processo de distribuicao por ID, rubrica, periodo ou status.',
    inputSchema: z.object({
      processoId: z.string().optional(),
      rubricaSigla: z.string().optional(),
      periodo: z.string().optional(),
      status: z.string().optional(),
    }),
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'distribuicao.processos.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.distribuicaoBaseUrl,
        path: context.processoId
          ? `/processos/${encodeURIComponent(context.processoId)}`
          : '/processos',
        runtimeContext,
        searchParams: {
          rubricaSigla: context.rubricaSigla,
          periodo: context.periodo,
          status: context.status,
        },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['descricao', 'rubricaSigla', 'periodo'], ['status']),
        source: successSource('consultarProcessoDistribuicao'),
      };
    },
  });

  return {
    consultarProcessoDistribuicao,
  };
}
