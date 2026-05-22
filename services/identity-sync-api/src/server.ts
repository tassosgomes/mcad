import Fastify, { type FastifyInstance } from 'fastify';
import type { IdentitySyncConfig } from './config.js';
import type { LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';
import type { SyncScheduler } from './scheduler.js';
import { syncLogtoUsers } from './sync.js';

export interface BuildServerDeps {
  publisher: IdentityEventPublisher;
  logtoUsers: LogtoUserImporter;
  scheduler?: SyncScheduler | null;
}

export async function buildServer(
  config: IdentitySyncConfig,
  deps: BuildServerDeps,
): Promise<FastifyInstance> {
  const { publisher, logtoUsers, scheduler = null } = deps;

  const server = Fastify({
    logger: true,
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: true,
  });

  server.get('/health/live', async () => ({
    status: 'UP',
    service: 'mcad-identity-sync-api',
  }));

  server.get('/health/ready', async (_request, reply) => {
    const ready = await publisher.ready();
    if (!ready) {
      return reply.code(503).send({ status: 'DOWN', dependencies: { rabbitmq: 'DOWN' } });
    }

    return { status: 'UP', dependencies: { rabbitmq: 'UP' } };
  });

  server.post('/sync/logto/users', async (request, reply) => {
    if (
      !config.syncAdminToken ||
      headerValue(request.headers['x-sync-admin-token']) !== config.syncAdminToken
    ) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const result = scheduler
      ? await scheduler.runNow()
      : await syncLogtoUsers(logtoUsers, publisher);

    const statusCode = result.error ? 500 : 202;
    return reply.code(statusCode).send({
      received: !result.error,
      published: result.published,
      fetched: result.fetched,
      skipped: result.skipped,
      durationMs: result.durationMs,
      error: result.error,
    });
  });

  server.get('/sync/status', async (_request, reply) => {
    const last = scheduler?.lastResult() ?? null;
    return reply.send({
      schedulerEnabled: Boolean(scheduler),
      intervalMs: config.syncIntervalMs,
      lastRun: last,
    });
  });

  return server;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
