import Fastify, { type FastifyInstance } from 'fastify';
import type { IdentitySyncConfig } from './config.js';
import { normalizeLogtoWebhook } from './events.js';
import type { LogtoUser, LogtoUserImporter } from './logto.js';
import type { IdentityEventPublisher } from './publisher.js';
import { verifyLogtoSignature } from './signature.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export async function buildServer(
  config: IdentitySyncConfig,
  publisher: IdentityEventPublisher,
  logtoUsers: LogtoUserImporter | null = null,
): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true,
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: true,
  });

  server.removeContentTypeParser('application/json');
  server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (request, body, done) => {
    const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body);
    request.rawBody = rawBody;
    try {
      done(null, JSON.parse(rawBody.toString('utf8')));
    } catch (error) {
      done(error as Error);
    }
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

  server.post('/webhooks/logto', async (request, reply) => {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    const signature = headerValue(request.headers['logto-signature-sha-256']);

    if (!verifyLogtoSignature(rawBody, signature, config.webhookSigningKey)) {
      request.log.warn('Rejected Logto webhook with invalid signature');
      return reply.code(401).send({ error: 'Invalid signature' });
    }

    const event = normalizeLogtoWebhook(request.body, rawBody);
    if (!event) {
      request.log.info('Ignoring Logto webhook without user payload');
      return reply.code(202).send({ received: true, ignored: true });
    }

    await publisher.publish(event);

    return reply.code(202).send({
      received: true,
      eventId: event.eventId,
      eventType: event.eventType,
    });
  });

  server.post('/sync/logto/users', async (request, reply) => {
    if (!config.syncAdminToken || headerValue(request.headers['x-sync-admin-token']) !== config.syncAdminToken) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    if (!logtoUsers) {
      return reply.code(503).send({ error: 'Logto importer is not configured' });
    }

    const users = await logtoUsers.listUsers();
    let published = 0;
    for (const user of users) {
      const payload = buildBackfillPayload(user);
      const body = Buffer.from(JSON.stringify(payload));
      const event = normalizeLogtoWebhook(payload, body);
      if (!event) {
        continue;
      }
      await publisher.publish(event);
      published++;
    }

    return reply.code(202).send({ received: true, published });
  });

  server.addHook('onClose', async () => {
    await publisher.close();
  });

  return server;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildBackfillPayload(user: LogtoUser): Record<string, unknown> {
  return {
    event: 'User.Data.Updated',
    createdAt: new Date().toISOString(),
    user,
  };
}
