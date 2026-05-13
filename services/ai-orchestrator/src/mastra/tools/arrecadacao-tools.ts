import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ToolFactoryContext } from './tool-helpers.js';
import { getToolJson, requireToolPermission, toLookupItems } from './tool-helpers.js';
import { lookupResultSchema, successSource } from './tool-results.js';

export function createArrecadacaoTools({ config }: ToolFactoryContext) {
  const consultarPagamento = createTool({
    id: 'consultarPagamento',
    description: 'Consulta pagamentos, licencas ou verbas por ID, rubrica e periodo.',
    inputSchema: z.object({
      termo: z.string().min(1).optional(),
      rubricaSigla: z.string().optional(),
      periodo: z.string().optional(),
    }),
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'arrecadacao.pagamentos.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.arrecadacaoBaseUrl,
        path: context.termo ? `/pagamentos/${encodeURIComponent(context.termo)}` : '/pagamentos',
        runtimeContext,
        searchParams: {
          rubricaSigla: context.rubricaSigla,
          periodo: context.periodo,
        },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['descricao', 'rubricaSigla', 'periodo'], ['status']),
        source: successSource('consultarPagamento'),
      };
    },
  });

  return {
    consultarPagamento,
  };
}
