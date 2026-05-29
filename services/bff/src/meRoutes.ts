import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type AuthorizationContextPayload, type MeCache } from './meCache.js';
import {
  deriveSubjectIdFromJwt,
  extractBearer,
  type FetchLike,
  resolveAuthzContext,
  sendError,
} from './authzContext.js';

export interface MeRoutesOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl?: FetchLike;
}

export async function registerMeRoutes(
  server: FastifyInstance,
  options: MeRoutesOptions,
): Promise<void> {
  const { config, cache } = options;
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for me routes');
  }

  async function getContext(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ payload: AuthorizationContextPayload; authzVersionHeader: string | null } | undefined> {
    const token = extractBearer(request);
    if (!token) {
      sendError(reply, 401, 'UNAUTHORIZED');
      return undefined;
    }

    const subjectId = deriveSubjectIdFromJwt(token);

    if (subjectId) {
      const cached = cache.get(subjectId);
      if (cached) {
        return { payload: cached, authzVersionHeader: String(cached.version) };
      }
    }

    const resolved = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!resolved) {
      return undefined;
    }

    const cacheKey = resolved.payload.user.subject ?? subjectId;
    if (cacheKey) {
      cache.set(cacheKey, resolved.payload, config.meCacheTtlSeconds);
    }

    return resolved;
  }

  server.get('/api/me', async (request, reply) => {
    const result = await getContext(request, reply);
    if (!result) return;

    const { user } = result.payload;
    return reply.code(200).send({
      subjectId: user.subject,
      name: user.name,
      email: user.email,
    });
  });

  server.get('/api/me/permissions', async (request, reply) => {
    const result = await getContext(request, reply);
    if (!result) return;

    const { payload } = result;

    if (result.authzVersionHeader) {
      reply.header('x-authz-version', result.authzVersionHeader);
    } else {
      reply.header('x-authz-version', String(payload.version));
    }

    return reply.code(200).send({
      subjectId: payload.user.subject,
      permissions: payload.permissions,
      version: payload.version,
    });
  });
}
