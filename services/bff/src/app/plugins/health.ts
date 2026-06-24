import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';

export function registerHealthRoutes(server: FastifyInstance, config: BffConfig): void {
  server.get('/health/live', async () => ({
    status: 'UP',
    service: 'mcad-bff',
  }));

  server.get('/health/ready', async () => ({
    status: 'UP',
    upstreams: config.upstreams.map((upstream) => upstream.name),
  }));
}
