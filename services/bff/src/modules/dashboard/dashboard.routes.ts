import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import type { FetchLike } from '../../shared/auth/authzContext.js';
import type { MeCache } from '../../shared/auth/meCache.js';
import { buildDashboard } from './dashboard.service.js';

export interface DashboardRoutesOptions {
  config: BffConfig;
  cache: MeCache;
  fetchImpl?: FetchLike;
}

export async function registerDashboardRoutes(
  server: FastifyInstance,
  options: DashboardRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/me/dashboard', async (request, reply) => {
    const result = await buildDashboard(request, reply, serviceOptions);
    if (!result) return;

    return reply.code(200).send(result);
  });

  server.log.info('registered dashboard aggregation route: GET /api/me/dashboard');
}
