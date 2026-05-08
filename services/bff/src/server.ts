import Fastify, { type FastifyInstance } from 'fastify';
import type { BffConfig } from './config.js';
import { registerProxy } from './proxy.js';

export async function buildServer(config: BffConfig): Promise<FastifyInstance> {
  const server = Fastify({
    logger: true,
    bodyLimit: config.requestBodyLimitBytes,
    trustProxy: true,
  });

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
