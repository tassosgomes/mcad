import type { FastifyInstance } from 'fastify';
import type { BffConfig } from './config.js';
import { type FetchLike, resolveAuthzContext, sendError } from './authzContext.js';

/**
 * Proxies the audit-service timeline response for Processo:
 * {
 *   events: [{
 *     id, eventType: 'SCREEN_ACCESS' | 'USER_ACTION' | 'DATA_CHANGE',
 *     occurredAt, subject, entityType: 'Processo', entityId, action?,
 *     payload?: {before?, after?}, correlationId?
 *   }],
 *   page, size, total
 * }
 *
 * The event payload follows audit-contract schema v1; DATA_CHANGE events carry
 * the diff data required by the Processo history tab.
 */

const VIEW_HISTORY_PERMISSION = 'distribuicao:default:processo:ver-historico-alteracoes';

export interface HistoricoRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

function isJsonObject(value: unknown): boolean {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function correlationIdFromHeader(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) {
    return value[0] && value[0].trim() ? value[0].trim() : fallback;
  }
  return value && value.trim() ? value.trim() : fallback;
}

export async function registerHistoricoRoutes(
  server: FastifyInstance,
  options: HistoricoRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for historico routes');
  }

  server.get('/api/distribuicao/processos/:id/historico', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!ctx.payload.permissions.includes(VIEW_HISTORY_PERMISSION)) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const params = request.params as { id?: string };
    const processoId = params.id;
    if (!processoId) {
      return sendError(reply, 400, 'INVALID_REQUEST', 'processo id is required');
    }

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    const url = `${options.config.auditBaseUrl}/entities/Processo/${encodeURIComponent(processoId)}/timeline`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.config.auditTimeoutMs);

    reply.header('x-correlation-id', correlationId);

    try {
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${ctx.token}`,
          accept: 'application/json',
          'x-correlation-id': correlationId,
        },
        signal: controller.signal,
      });

      if (response.status === 200) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          request.log.warn({ url }, 'audit returned malformed json');
          return reply.code(502).send({ code: 'AUDIT_UNEXPECTED' });
        }

        if (!isJsonObject(body)) {
          request.log.warn({ url }, 'audit returned malformed payload');
          return reply.code(502).send({ code: 'AUDIT_UNEXPECTED' });
        }

        return reply.code(200).send(body);
      }

      if (response.status === 404) {
        return reply.code(404).send({ code: 'PROCESSO_NOT_FOUND' });
      }

      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        request.log.warn({ url, status: response.status }, 'audit upstream error');
        return reply.code(503).send({ code: 'AUDIT_UNAVAILABLE' });
      }

      request.log.warn({ url, status: response.status }, 'audit returned unexpected status');
      return reply.code(502).send({ code: 'AUDIT_UNEXPECTED' });
    } catch (error) {
      const isAbort = (error as { name?: string })?.name === 'AbortError';
      request.log.error(
        { url, err: error, timeout: isAbort },
        isAbort ? 'audit request timed out' : 'audit request failed',
      );
      return reply.code(503).send({ code: 'AUDIT_UNAVAILABLE' });
    } finally {
      clearTimeout(timer);
    }
  });
}
