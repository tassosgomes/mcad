import Fastify, { type FastifyInstance } from 'fastify';
import type { BffConfig } from './config.js';
import { registerAcessosRoutes } from './acessosRoutes.js';
import { registerAuditoriaRoutes } from './auditoriaRoutes.js';
import { registerHistoricoRoutes } from './historicoRoutes.js';
import { createMeCache, type MeCache } from './meCache.js';
import { registerMeRoutes } from './meRoutes.js';
import { registerProxy } from './proxy.js';
import { registerDashboardRoutes } from './dashboardRoutes.js';
import { AuditMetricsRegistry } from './auditoria/auditMetrics.js';
import { registerPermissionLifecycleRoutes } from './authzPermissionLifecycleRoutes.js';

export interface BuildServerOptions {
  meCache?: MeCache;
  fetchImpl?: typeof globalThis.fetch;
  auditMetrics?: AuditMetricsRegistry;
}

function registerCors(server: FastifyInstance, allowedOrigins: string[]) {
  server.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;

    const allowedOrigin = origin ? allowedOrigins.find((o) => o === origin) : undefined;
    if (allowedOrigin) {
      reply.header('vary', 'Origin');
      reply.header('access-control-allow-origin', allowedOrigin);
      reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.header(
        'access-control-allow-headers',
        request.headers['access-control-request-headers'] ?? 'authorization,content-type',
      );
      reply.header(
        'access-control-expose-headers',
        [
          'content-disposition',
          'traceparent',
          'x-authz-version',
          'x-audit-command-id',
          'x-audit-route',
          'x-audit-screen-access-id',
          'x-audit-screen-id',
          'x-audit-screen-name',
          'x-audit-session-id',
          'x-mcad-bff-upstream',
          'x-mcad-request-id',
        ].join(','),
      );
      reply.header('access-control-max-age', '600');
    }

    if (request.method === 'OPTIONS') {
      reply.code(204).send();
      return;
    }

    done();
  });
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

  registerCors(server, config.corsAllowedOrigins);
  const auditMetrics = options.auditMetrics ?? new AuditMetricsRegistry();

  server.get('/health/live', async () => ({
    status: 'UP',
    service: 'mcad-bff',
  }));

  server.get('/health/ready', async () => ({
    status: 'UP',
    upstreams: config.upstreams.map((upstream) => upstream.name),
  }));

  server.get('/metrics', async (_request, reply) => {
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return auditMetrics.renderPrometheus();
  });

  // Rotas proprias do BFF — devem ser registradas antes dos proxies para
  // garantir que /api/me/* nao seja capturado por nenhum upstream.
  const meCache = options.meCache ?? createMeCache();
  await registerMeRoutes(server, {
    config,
    cache: meCache,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerMeRoutes>[1]['fetchImpl'],
  });
  await registerAcessosRoutes(server, {
    config,
    cache: meCache,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerAcessosRoutes>[1]['fetchImpl'],
  });
  await registerHistoricoRoutes(server, {
    config,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerHistoricoRoutes>[1]['fetchImpl'],
  });
  await registerAuditoriaRoutes(server, {
    config,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerAuditoriaRoutes>[1]['fetchImpl'],
    auditMetrics,
  });
  await registerDashboardRoutes(server, {
    config,
    cache: meCache,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerDashboardRoutes>[1]['fetchImpl'],
  });
  await registerPermissionLifecycleRoutes(server, {
    config,
    fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerPermissionLifecycleRoutes>[1]['fetchImpl'],
  });

  for (const upstream of config.upstreams) {
    await registerProxy(server, upstream, {
      config,
      fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerProxy>[2]['fetchImpl'],
      auditMetrics,
    });
  }

  if (config.enableLegacyCadastroRoute) {
    const cadastro = config.upstreams.find((upstream) => upstream.name === 'cadastro');

    if (cadastro) {
      await registerProxy(
        server,
        {
          ...cadastro,
          name: 'cadastro-legacy',
          prefix: '/api/v1',
        },
        {
          config,
          fetchImpl: options.fetchImpl as unknown as Parameters<typeof registerProxy>[2]['fetchImpl'],
          auditMetrics,
        },
      );
    }
  }

  return server;
}
