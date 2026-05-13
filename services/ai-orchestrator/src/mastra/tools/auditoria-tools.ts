import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ToolFactoryContext } from './tool-helpers.js';
import { getToolJson, requireToolPermission, toLookupItems } from './tool-helpers.js';
import { lookupResultSchema, successSource } from './tool-results.js';

export function createAuditoriaTools({ config }: ToolFactoryContext) {
  const consultarAuditoria = createTool({
    id: 'consultarAuditoria',
    description: 'Consulta historico auditavel de uma entidade por tipo e ID.',
    inputSchema: z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      limit: z.number().int().positive().max(20).default(10),
    }),
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'auditoria.eventos.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.auditoriaBaseUrl,
        path: `/audit/entities/${encodeURIComponent(context.entityType)}/${encodeURIComponent(context.entityId)}/timeline`,
        runtimeContext,
        searchParams: { limit: context.limit },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['eventType', 'descricao', 'label'], ['status']),
        source: successSource('consultarAuditoria'),
      };
    },
  });

  return {
    consultarAuditoria,
  };
}
