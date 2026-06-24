import type { FastifyInstance } from 'fastify';

export function registerCors(server: FastifyInstance, allowedOrigins: string[]): void {
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
