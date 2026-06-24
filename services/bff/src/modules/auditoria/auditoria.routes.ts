import type { FastifyInstance } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import type { FetchLike } from '../../shared/auth/authzContext.js';
import type { AuditMetricsRegistry } from '../../shared/audit/auditMetrics.js';
import {
  handleAuditEventDetail,
  handleAuditList,
  handleCatalog,
  handleCreateReport,
  handleFriendlyAuditList,
} from './auditoria.service.js';

export interface AuditoriaRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
  auditMetrics?: AuditMetricsRegistry;
}

export async function registerAuditoriaRoutes(
  server: FastifyInstance,
  options: AuditoriaRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for auditoria routes');
  }

  const serviceOptions = {
    ...options,
    fetchImpl,
  };

  server.get('/api/auditoria/catalogo', (request, reply) =>
    handleCatalog(request, reply, serviceOptions));
  server.get('/api/auditoria/v1/catalogo', (request, reply) =>
    handleCatalog(request, reply, serviceOptions));
  server.get('/api/auditoria/eventos', (request, reply) =>
    handleFriendlyAuditList(request, reply, serviceOptions));
  server.get('/api/auditoria/eventos/:eventId', (request, reply) => {
    const params = request.params as { eventId: string };
    return handleAuditEventDetail(
      request,
      reply,
      serviceOptions,
      `/audit/events/${encodeURIComponent(params.eventId)}`,
    );
  });
  server.get('/api/auditoria/v1/audit/entities/:entityType/:entityId/timeline', (request, reply) =>
    handleAuditList(request, reply, serviceOptions));
  server.get('/api/auditoria/v1/audit/events', (request, reply) =>
    handleAuditList(request, reply, serviceOptions));
  server.get('/api/auditoria/v1/audit/events/:eventId', (request, reply) =>
    handleAuditEventDetail(request, reply, serviceOptions));
  server.get('/api/auditoria/v1/audit/screen-access', (request, reply) =>
    handleAuditList(request, reply, serviceOptions));
  server.post('/api/auditoria/v1/audit/reports', (request, reply) =>
    handleCreateReport(request, reply, serviceOptions));
}
