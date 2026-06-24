import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import type { FetchLike } from '../../shared/auth/authzContext.js';
import type { MeCache } from '../../shared/auth/meCache.js';
import {
  buildMePermissions,
  buildMeProfile,
  resolveMeContext,
} from './me.service.js';

export interface MeRoutesOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl?: FetchLike;
}

export async function registerMeRoutes(
  server: FastifyInstance,
  options: MeRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for me routes');
  }

  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/me', async (request, reply) => {
    const result = await resolveMeContext(request, reply, serviceOptions);
    if (!result) return;

    return reply.code(200).send(buildMeProfile(result.payload));
  });

  server.get('/api/me/permissions', async (request, reply) => {
    const result = await resolveMeContext(request, reply, serviceOptions);
    if (!result) return;

    if (result.authzVersionHeader) {
      reply.header('x-authz-version', result.authzVersionHeader);
    } else {
      reply.header('x-authz-version', String(result.payload.version));
    }

    return reply.code(200).send(buildMePermissions(result.payload));
  });
}
