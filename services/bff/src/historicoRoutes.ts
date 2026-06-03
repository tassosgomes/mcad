import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type FetchLike, resolveAuthzContext, sendError } from './authzContext.js';
import { toUuidCorrelationId } from './correlationId.js';

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
const GLOBAL_ASSIGNMENT_HISTORY_PERMISSION = 'acessos:default:atribuicao:ver-historico';
const SCOPED_ASSIGNMENT_HISTORY_PERMISSION = /^acessos:([a-z-]+):atribuicao:ver-historico$/;

export interface HistoricoRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

function isJsonObject(value: unknown): boolean {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function correlationIdFromHeader(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const candidate = raw && raw.trim() ? raw.trim() : fallback;
  return toUuidCorrelationId(candidate);
}

function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function roleDomainFromKey(roleKey: string): string {
  return roleKey.split('.')[0] ?? 'unknown';
}

function deriveAssignmentHistoryDomains(permissions: string[]): { allDomains: boolean; scoped: string[] } {
  if (permissions.includes(GLOBAL_ASSIGNMENT_HISTORY_PERMISSION)) {
    return { allDomains: true, scoped: [] };
  }

  const scoped = permissions
    .map((permission) => SCOPED_ASSIGNMENT_HISTORY_PERMISSION.exec(permission)?.[1])
    .filter((domain): domain is string => Boolean(domain) && domain !== 'default');

  return { allDomains: false, scoped: [...new Set(scoped)] };
}

function appendAssignmentHistoryQuery(url: URL, query: Record<string, unknown>, scopedDomains: string[]): void {
  const userId = queryValue(query.userId);
  const roleKey = queryValue(query.roleKey);
  const page = queryValue(query.page);
  const size = queryValue(query.size);

  if (userId) url.searchParams.set('userId', userId);
  if (roleKey) url.searchParams.set('roleKey', roleKey);
  if (page) url.searchParams.set('page', page);
  if (size) url.searchParams.set('size', size);
  for (const domain of scopedDomains) {
    url.searchParams.append('domain', domain);
  }
}

async function fetchAuditJson(
  request: FastifyRequest,
  fetchImpl: FetchLike,
  token: string,
  url: string,
  correlationId: string,
  timeoutMs: number,
): Promise<{ status: number; body?: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${token}`,
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
        return { status: 502, body: { code: 'AUDIT_UNEXPECTED' } };
      }

      if (!isJsonObject(body)) {
        request.log.warn({ url }, 'audit returned malformed payload');
        return { status: 502, body: { code: 'AUDIT_UNEXPECTED' } };
      }

      return { status: 200, body };
    }

    if (response.status === 404) {
      return { status: 404 };
    }

    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      request.log.warn({ url, status: response.status }, 'audit upstream error');
      return { status: 503, body: { code: 'AUDIT_UNAVAILABLE' } };
    }

    request.log.warn({ url, status: response.status }, 'audit returned unexpected status');
    return { status: 502, body: { code: 'AUDIT_UNEXPECTED' } };
  } catch (error) {
    const isAbort = (error as { name?: string })?.name === 'AbortError';
    request.log.error(
      { url, err: error, timeout: isAbort },
      isAbort ? 'audit request timed out' : 'audit request failed',
    );
    return { status: 503, body: { code: 'AUDIT_UNAVAILABLE' } };
  } finally {
    clearTimeout(timer);
  }
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
    reply.header('x-correlation-id', correlationId);

    const result = await fetchAuditJson(request, fetchImpl, ctx.token, url, correlationId, options.config.auditTimeoutMs);

    if (result.status === 404) {
      return reply.code(404).send({ code: 'PROCESSO_NOT_FOUND' });
    }

    return reply.code(result.status).send(result.body);
  });

  server.get('/api/acessos/atribuicoes/historico', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    const access = deriveAssignmentHistoryDomains(ctx.payload.permissions);
    if (!access.allDomains && access.scoped.length === 0) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const query = (request.query as Record<string, unknown>) ?? {};
    const roleKey = queryValue(query.roleKey);
    if (roleKey && !access.allDomains && !access.scoped.includes(roleDomainFromKey(roleKey))) {
      return sendError(reply, 403, 'PERMISSION_DENIED');
    }

    const url = new URL(`${options.config.auditBaseUrl}/assignments/history`);
    const scopedDomains = access.allDomains ? [] : access.scoped;
    appendAssignmentHistoryQuery(url, query, scopedDomains);

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    reply.header('x-correlation-id', correlationId);

    const result = await fetchAuditJson(
      request,
      fetchImpl,
      ctx.token,
      url.toString(),
      correlationId,
      options.config.auditTimeoutMs,
    );

    if (result.status === 404 || result.status === 503) {
      return reply.code(503).send({ code: 'AUDIT_UNAVAILABLE' });
    }

    return reply.code(result.status).send(result.body);
  });
}
