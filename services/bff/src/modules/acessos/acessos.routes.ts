import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import type { FetchLike } from '../../shared/auth/authzContext.js';
import type { MeCache } from '../../shared/auth/meCache.js';
import {
  handleAtribuirPapel,
  handleListAssignments,
  handleListPapeis,
  handleListUsuarios,
  handleRemoverPapel,
} from './acessos.service.js';

export interface AcessosRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
  cache?: MeCache;
}

export async function registerAcessosRoutes(
  server: FastifyInstance,
  options: AcessosRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for acessos routes');
  }

  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/acessos/usuarios', (request, reply) =>
    handleListUsuarios(request, reply, serviceOptions));
  server.get('/api/acessos/assignments', (request, reply) =>
    handleListAssignments(request, reply, serviceOptions));
  server.get('/api/acessos/papeis', (request, reply) =>
    handleListPapeis(request, reply, serviceOptions));
  server.post('/api/acessos/papeis/atribuir', (request, reply) =>
    handleAtribuirPapel(request, reply, serviceOptions));
  server.delete('/api/acessos/papeis/atribuir/:assignmentId', (request, reply) =>
    handleRemoverPapel(request, reply, serviceOptions));
}
