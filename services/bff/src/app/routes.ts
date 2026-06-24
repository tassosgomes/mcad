import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../config/config.js';
import { registerAcessosRoutes } from '../modules/acessos/acessos.routes.js';
import { registerAuditoriaRoutes } from '../modules/auditoria/auditoria.routes.js';
import { registerHistoricoRoutes } from '../modules/historico/historico.routes.js';
import { createMeCache, type MeCache } from '../shared/auth/meCache.js';
import { registerMeRoutes } from '../modules/me/me.routes.js';
import { registerProxy } from '../proxy/registerProxy.js';
import { registerDashboardRoutes } from '../modules/dashboard/dashboard.routes.js';
import type { AuditMetricsRegistry } from '../shared/audit/auditMetrics.js';
import { registerPermissionLifecycleRoutes } from '../modules/autorizacao/permissoes/permissionLifecycle.routes.js';

export interface RegisterBffRoutesOptions {
  meCache?: MeCache;
  fetchImpl?: typeof globalThis.fetch;
  auditMetrics: AuditMetricsRegistry;
}

export async function registerBffRoutes(
  server: FastifyInstance,
  config: BffConfig,
  options: RegisterBffRoutesOptions,
): Promise<void> {
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
    auditMetrics: options.auditMetrics,
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
      auditMetrics: options.auditMetrics,
    });
  }

  if (!config.enableLegacyCadastroRoute) {
    return;
  }

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
        auditMetrics: options.auditMetrics,
      },
    );
  }
}
