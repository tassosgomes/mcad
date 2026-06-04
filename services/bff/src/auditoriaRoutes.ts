import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import {
  type FetchLike,
  type ResolvedAuthzContext,
  resolveAuthzContext,
  sendError,
} from './authzContext.js';
import { toUuidCorrelationId } from './correlationId.js';
import { AUDITORIA_PERMISSIONS, type AuditoriaPermission } from './auditoria/auditoriaPermissions.js';
import { AUDIT_CATALOG_VERSION, screenAuditCatalog } from './auditoria/screenAuditCatalog.js';

export interface AuditoriaRoutesOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
}

interface FrontendCreateReportPayload {
  reportType?: unknown;
  from?: unknown;
  to?: unknown;
  filters?: unknown;
  format?: unknown;
}

interface UpstreamReportPayload {
  reportType: string;
  requestedBy: string;
  fromUtc: string;
  toUtc: string;
  filter: Record<string, unknown>;
}

const REPORT_TYPES = new Set(['DATA_CHANGE', 'SCREEN_ACCESS', 'MIXED']);
const BFF_AUDITORIA_V1_PREFIX = '/api/auditoria/v1';

interface AuditJsonResult {
  status: number;
  body?: unknown;
}

function correlationIdFromHeader(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const candidate = raw && raw.trim() ? raw.trim() : fallback;
  return toUuidCorrelationId(candidate);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildFilter(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const source = value as Record<string, unknown>;
  const filter: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        filter[key] = trimmed;
      }
      continue;
    }
    filter[key] = raw;
  }
  return filter;
}

function resolveRequestedBy(user: { name?: string; email?: string; subject: string; id?: string }): string {
  return (
    asString(user.name) ?? asString(user.email) ?? asString(user.subject) ?? asString(user.id) ?? 'unknown'
  );
}

function hasPermission(ctx: ResolvedAuthzContext, permission: AuditoriaPermission): boolean {
  return ctx.payload.permissions.includes(permission);
}

function requirePermission(
  reply: FastifyReply,
  ctx: ResolvedAuthzContext,
  permission: AuditoriaPermission,
  message = 'Permission denied',
): boolean {
  if (hasPermission(ctx, permission)) {
    return true;
  }

  sendError(reply, 403, 'FORBIDDEN', message);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildAuditServiceUrl(baseUrl: string, endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  if (baseUrl.endsWith('/audit') && normalizedPath.startsWith('/audit/')) {
    return `${baseUrl}${normalizedPath.slice('/audit'.length)}`;
  }

  return `${baseUrl}${normalizedPath}`;
}

function buildAuditServiceUrlFromRequest(
  config: BffConfig,
  request: FastifyRequest,
  endpointPath?: string,
): string {
  const sourceUrl = new URL(request.url, 'http://mcad-bff.local');
  const path = endpointPath
    ?? (sourceUrl.pathname.startsWith(BFF_AUDITORIA_V1_PREFIX)
      ? sourceUrl.pathname.slice(BFF_AUDITORIA_V1_PREFIX.length)
      : sourceUrl.pathname);
  const targetUrl = new URL(buildAuditServiceUrl(config.auditBaseUrl, path || '/'));
  targetUrl.search = sourceUrl.search;

  return targetUrl.toString();
}

function hasSnapshotPayload(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const screen = value.screen;
  if (isRecord(screen) && isRecord(screen.businessContext)) {
    if (Object.prototype.hasOwnProperty.call(screen.businessContext, 'snapshot')) {
      return screen.businessContext.snapshot !== null && screen.businessContext.snapshot !== undefined;
    }
  }

  return hasSnapshotPayload(value.payload);
}

function redactSnapshots(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSnapshots);
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (key === 'snapshot') {
      continue;
    }
    sanitized[key] = redactSnapshots(raw);
  }

  return sanitized;
}

function buildCatalogResponse() {
  return {
    version: AUDIT_CATALOG_VERSION,
    items: screenAuditCatalog.map((operation) => ({
      id: operation.id,
      aliases: operation.aliases,
      domain: operation.domain,
      friendlyName: operation.friendlyName,
      routePatterns: operation.routePatterns,
      methods: operation.methods,
      level: operation.level,
      justification: operation.justification,
      owner: operation.owner,
      approvedBy: operation.approvedBy,
      approvedAt: operation.approvedAt,
      changeReason: operation.changeReason,
      retentionDays: operation.retentionDays,
    })),
  };
}

function buildUpstreamPayload(
  body: FrontendCreateReportPayload,
  user: { name?: string; email?: string; subject: string; id?: string },
): { ok: true; payload: UpstreamReportPayload } | { ok: false; message: string } {
  const reportType = asString(body.reportType);
  if (!reportType || !REPORT_TYPES.has(reportType)) {
    return { ok: false, message: 'reportType is required and must be one of DATA_CHANGE, SCREEN_ACCESS, MIXED' };
  }

  const fromUtc = asString(body.from);
  const toUtc = asString(body.to);
  if (!fromUtc || !toUtc) {
    return { ok: false, message: 'from and to are required (ISO instant)' };
  }

  return {
    ok: true,
    payload: {
      reportType,
      requestedBy: resolveRequestedBy(user),
      fromUtc,
      toUtc,
      filter: buildFilter(body.filters),
    },
  };
}

async function postAuditReport(
  request: FastifyRequest,
  fetchImpl: FetchLike,
  token: string,
  url: string,
  payload: UpstreamReportPayload,
  correlationId: string,
  timeoutMs: number,
): Promise<{ status: number; body?: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.status >= 200 && response.status < 300) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        request.log.warn({ url }, 'audit returned malformed json');
        return { status: 502, body: { code: 'AUDIT_UNEXPECTED' } };
      }
      return { status: response.status, body };
    }

    if (response.status === 400 || response.status === 422) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = { code: 'AUDIT_INVALID_REQUEST' };
      }
      request.log.warn({ url, status: response.status }, 'audit rejected report request');
      return { status: response.status, body };
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
      isAbort ? 'audit report request timed out' : 'audit report request failed',
    );
    return { status: 503, body: { code: 'AUDIT_UNAVAILABLE' } };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAuditJson(
  request: FastifyRequest,
  fetchImpl: FetchLike,
  token: string,
  url: string,
  correlationId: string,
  timeoutMs: number,
): Promise<AuditJsonResult> {
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

    if (response.status >= 200 && response.status < 300) {
      let body: unknown;
      try {
        body = response.status === 204 ? undefined : await response.json();
      } catch {
        request.log.warn({ url }, 'audit returned malformed json');
        return { status: 502, body: { code: 'AUDIT_UNEXPECTED' } };
      }
      return { status: response.status, body };
    }

    if ([400, 401, 403, 404, 422].includes(response.status)) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = { code: 'AUDIT_INVALID_REQUEST' };
      }
      request.log.warn({ url, status: response.status }, 'audit rejected request');
      return { status: response.status, body };
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

export async function registerAuditoriaRoutes(
  server: FastifyInstance,
  options: AuditoriaRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for auditoria routes');
  }

  async function handleCatalog(request: FastifyRequest, reply: FastifyReply) {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!requirePermission(reply, ctx, AUDITORIA_PERMISSIONS.catalogView)) {
      return;
    }

    return reply.send(buildCatalogResponse());
  }

  async function handleAuditList(
    request: FastifyRequest,
    reply: FastifyReply,
    endpointPath?: string,
  ) {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!requirePermission(reply, ctx, AUDITORIA_PERMISSIONS.eventList)) {
      return;
    }

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    reply.header('x-correlation-id', correlationId);

    const url = buildAuditServiceUrlFromRequest(options.config, request, endpointPath);
    const upstream = await fetchAuditJson(
      request,
      fetchImpl,
      ctx.token,
      url,
      correlationId,
      options.config.auditTimeoutMs,
    );
    const body = hasPermission(ctx, AUDITORIA_PERMISSIONS.snapshotView)
      ? upstream.body
      : redactSnapshots(upstream.body);

    return reply.code(upstream.status).send(body);
  }

  async function handleAuditEventDetail(
    request: FastifyRequest,
    reply: FastifyReply,
    endpointPath?: string,
  ) {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!requirePermission(reply, ctx, AUDITORIA_PERMISSIONS.eventList)) {
      return;
    }

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    reply.header('x-correlation-id', correlationId);

    const url = buildAuditServiceUrlFromRequest(options.config, request, endpointPath);
    const upstream = await fetchAuditJson(
      request,
      fetchImpl,
      ctx.token,
      url,
      correlationId,
      options.config.auditTimeoutMs,
    );

    if (
      upstream.status >= 200
      && upstream.status < 300
      && hasSnapshotPayload(upstream.body)
      && !hasPermission(ctx, AUDITORIA_PERMISSIONS.snapshotView)
    ) {
      return sendError(
        reply,
        403,
        'FORBIDDEN',
        'Snapshot access requires auditoria:default:snapshot:visualizar',
      );
    }

    return reply.code(upstream.status).send(upstream.body);
  }

  server.get('/api/auditoria/catalogo', handleCatalog);
  server.get('/api/auditoria/v1/catalogo', handleCatalog);
  server.get('/api/auditoria/eventos', (request, reply) =>
    handleAuditList(request, reply, '/audit/events'));
  server.get('/api/auditoria/eventos/:eventId', (request, reply) => {
    const params = request.params as { eventId: string };
    return handleAuditEventDetail(
      request,
      reply,
      `/audit/events/${encodeURIComponent(params.eventId)}`,
    );
  });
  server.get('/api/auditoria/v1/audit/entities/:entityType/:entityId/timeline', (request, reply) =>
    handleAuditList(request, reply));
  server.get('/api/auditoria/v1/audit/events', (request, reply) =>
    handleAuditList(request, reply));
  server.get('/api/auditoria/v1/audit/events/:eventId', handleAuditEventDetail);
  server.get('/api/auditoria/v1/audit/screen-access', (request, reply) =>
    handleAuditList(request, reply));

  server.post('/api/auditoria/v1/audit/reports', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    const body = (request.body ?? {}) as FrontendCreateReportPayload;
    const result = buildUpstreamPayload(body, ctx.payload.user);
    if (!result.ok) {
      return sendError(reply, 400, 'INVALID_REQUEST', result.message);
    }

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    reply.header('x-correlation-id', correlationId);

    const url = buildAuditServiceUrl(options.config.auditBaseUrl, '/audit/reports');
    const upstream = await postAuditReport(
      request,
      fetchImpl,
      ctx.token,
      url,
      result.payload,
      correlationId,
      options.config.auditTimeoutMs,
    );

    return reply.code(upstream.status).send(upstream.body);
  });
}
