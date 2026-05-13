import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { assertPermission } from '../../http/auth-context.js';
import { runtimeContextToObject, type McadRuntimeContext } from '../../schemas/runtime-context.js';
import { successSource } from './tool-results.js';

export const permissionsResultSchema = z.object({
  userId: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  source: z.object({
    toolId: z.string(),
    status: z.enum(['success', 'denied', 'error']),
  }),
});

export const consultarPermissoesUsuario = createTool({
  id: 'consultarPermissoesUsuario',
  description: 'Consulta as permissoes efetivas do usuario autenticado no RuntimeContext.',
  inputSchema: z.object({}),
  outputSchema: permissionsResultSchema,
  execute: async ({ runtimeContext }) => {
    const mcadRuntimeContext = runtimeContext as McadRuntimeContext;
    assertPermission(mcadRuntimeContext, 'authz.permissions.read');
    const values = runtimeContextToObject(mcadRuntimeContext);

    return {
      userId: values.userId,
      roles: values.roles,
      permissions: values.permissions,
      source: successSource('consultarPermissoesUsuario'),
    };
  },
});
