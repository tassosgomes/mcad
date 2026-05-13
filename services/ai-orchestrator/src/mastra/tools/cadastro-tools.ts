import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ToolFactoryContext } from './tool-helpers.js';
import { getToolJson, requireToolPermission, toLookupItems } from './tool-helpers.js';
import { lookupResultSchema, successSource } from './tool-results.js';

const termoInputSchema = z.object({
  termo: z.string().min(2),
});

export function createCadastroTools({ config }: ToolFactoryContext) {
  const buscarObra = createTool({
    id: 'buscarObra',
    description: 'Consulta obra musical por ID, codigo, titulo ou ISWC.',
    inputSchema: termoInputSchema,
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'cadastro.obras.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.cadastroBaseUrl,
        path: '/obras',
        runtimeContext,
        searchParams: { q: context.termo },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['titulo', 'nome', 'label'], ['status']),
        source: successSource('buscarObra'),
      };
    },
  });

  const buscarFonograma = createTool({
    id: 'buscarFonograma',
    description: 'Consulta fonograma por ID, ISRC ou titulo.',
    inputSchema: termoInputSchema,
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'cadastro.fonogramas.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.cadastroBaseUrl,
        path: '/fonogramas',
        runtimeContext,
        searchParams: { q: context.termo },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['titulo', 'nome', 'isrc'], ['status']),
        source: successSource('buscarFonograma'),
      };
    },
  });

  const buscarTitular = createTool({
    id: 'buscarTitular',
    description: 'Consulta titular por ID, nome ou documento.',
    inputSchema: termoInputSchema,
    outputSchema: lookupResultSchema,
    execute: async ({ context, runtimeContext }, options) => {
      requireToolPermission(runtimeContext, 'cadastro.titulares.read');
      const payload = await getToolJson<unknown>({
        baseUrl: config.upstreams.cadastroBaseUrl,
        path: '/titulares',
        runtimeContext,
        searchParams: { q: context.termo },
        abortSignal: options?.abortSignal,
      });

      return {
        items: toLookupItems(payload, ['nome', 'razaoSocial', 'label'], ['status']),
        source: successSource('buscarTitular'),
      };
    },
  });

  return {
    buscarObra,
    buscarFonograma,
    buscarTitular,
  };
}
