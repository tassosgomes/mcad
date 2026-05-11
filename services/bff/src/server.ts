import Fastify, { type FastifyInstance } from 'fastify';
import type { BffConfig } from './config.js';
import { registerProxy } from './proxy.js';

function isCorsOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

function registerCors(server: FastifyInstance, allowedOrigins: string[]) {
  server.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;

    if (origin && isCorsOriginAllowed(origin, allowedOrigins)) {
      reply.header('vary', 'Origin');
      reply.header('access-control-allow-origin', origin);
      reply.header('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.header(
        'access-control-allow-headers',
        request.headers['access-control-request-headers'] ?? 'authorization,content-type',
      );
      reply.header(
        'access-control-expose-headers',
        'content-disposition,x-mcad-bff-upstream,x-mcad-request-id',
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

export async function buildServer(config: BffConfig): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true,
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: true,
  });

  registerCors(server, config.corsAllowedOrigins);

  server.get('/health/live', async () => ({
    status: 'UP',
    service: 'mcad-bff',
  }));

  server.get('/health/ready', async () => ({
    status: 'UP',
    upstreams: config.upstreams.map((upstream) => upstream.name),
  }));

  for (const upstream of config.upstreams) {
    await registerProxy(server, upstream);
  }

  if (config.enableLegacyCadastroRoute) {
    const cadastro = config.upstreams.find((upstream) => upstream.name === 'cadastro');

    if (cadastro) {
      await registerProxy(server, {
        ...cadastro,
        name: 'cadastro-legacy',
        prefix: '/api/v1',
      });
    }
  }

  return server;
}
