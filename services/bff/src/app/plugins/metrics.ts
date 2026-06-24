import type { FastifyInstance } from 'fastify';
import type { AuditMetricsRegistry } from '../../shared/audit/auditMetrics.js';

export function registerMetricsRoute(
  server: FastifyInstance,
  auditMetrics: AuditMetricsRegistry,
): void {
  server.get('/metrics', async (_request, reply) => {
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return auditMetrics.renderPrometheus();
  });
}
