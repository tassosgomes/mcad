import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../../config/config.js';
import type { FetchLike } from '../../../shared/auth/authzContext.js';
import {
  handleCreatePermission,
  handleDeprecatePermission,
  handleListLinkedRoles,
  handleReactivatePermission,
  handleRemovePermission,
} from './permissionLifecycle.service.js';

export interface PermissionLifecycleRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

export async function registerPermissionLifecycleRoutes(
  server: FastifyInstance,
  options: PermissionLifecycleRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for permission lifecycle routes');
  }

  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/autorizacao/permissoes/:id/papeis-vinculados', (request, reply) =>
    handleListLinkedRoles(request, reply, serviceOptions));
  server.post('/api/autorizacao/permissoes/:id/depreciar', (request, reply) =>
    handleDeprecatePermission(request, reply, serviceOptions));
  server.post('/api/autorizacao/permissoes', (request, reply) =>
    handleCreatePermission(request, reply, serviceOptions));
  server.post('/api/autorizacao/permissoes/:id/reativar', (request, reply) =>
    handleReactivatePermission(request, reply, serviceOptions));
  server.post('/api/autorizacao/permissoes/:id/remover', (request, reply) =>
    handleRemovePermission(request, reply, serviceOptions));
}
