import Fastify, { type FastifyInstance } from 'fastify';
import type { BffConfig } from '../config/config.js';
import type { MeCache } from '../shared/auth/meCache.js';
import { AuditMetricsRegistry } from '../shared/audit/auditMetrics.js';
import { registerBffRoutes } from './routes.js';
import { registerCors } from './plugins/cors.js';
import { registerHealthRoutes } from './plugins/health.js';
import { registerMetricsRoute } from './plugins/metrics.js';

export interface BuildServerOptions {
  meCache?: MeCache;
  fetchImpl?: typeof globalThis.fetch;
  auditMetrics?: AuditMetricsRegistry;
}

export async function buildServer(
  config: BffConfig,
  options: BuildServerOptions = {},
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true,
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: true,
  });

  const auditMetrics = options.auditMetrics ?? new AuditMetricsRegistry();

  registerCors(server, config.corsAllowedOrigins);
  registerHealthRoutes(server, config);
  registerMetricsRoute(server, auditMetrics);

  await registerBffRoutes(server, config, {
    meCache: options.meCache,
    fetchImpl: options.fetchImpl,
    auditMetrics,
  });

  return server;
}
