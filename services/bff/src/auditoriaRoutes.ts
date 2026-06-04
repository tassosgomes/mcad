import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { BffConfig } from './config.js';
import {
  type FetchLike,
  type ResolvedAuthzContext,
  resolveAuthzContext,
  sendError,
} from './authzContext.js';
import { toUuidCorrelationId } from './correlationId.js';
import { AUDITORIA_PERMISSIONS, type AuditoriaPermission } from './auditoria/auditoriaPermissions.js';
import { presentAuditEvent, presentAuditEventsBody } from './auditoria/auditEventPresenter.js';
import {
  buildAuditServiceUrl,
  createAuditQueryClient,
  parseAuditEventListQuery,
} from './auditoria/auditQueryClient.js';
import { publishAuditEvent } from './auditoria/auditEventPublisher.js';
import { buildScreenAccessEvent, type ScreenAccessActor } from './auditoria/screenAccessEventBuilder.js';
import { classifyScreenAuditRequest } from './auditoria/screenAuditClassifier.js';
import { AUDIT_CATALOG_VERSION, type AuditScreenOperation, screenAuditCatalog } from './auditoria/screenAuditCatalog.js';

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
const AUDIT_UNAVAILABLE = 'AUDIT_UNAVAILABLE';

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

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0);
  }

  return value?.trim() || undefined;
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

function buildActor(context: ResolvedAuthzContext): ScreenAccessActor {
  return {
    id: context.payload.user.id,
    subject: context.payload.user.subject,
    email: context.payload.user.email,
    name: context.payload.user.name,
    roles: context.payload.roles,
    authProvider: 'ecad-authz',
  };
}

function buildAuditHeaders(
  request: FastifyRequest,
  operation: AuditScreenOperation,
): Record<string, string> {
  return {
    'x-audit-screen-access-id': randomUUID(),
    'x-audit-screen-id': operation.id,
    'x-audit-screen-name': operation.friendlyName,
    'x-audit-route': request.url,
    'x-audit-session-id': randomUUID(),
    'x-audit-command-id': randomUUID(),
  };
}

function addAuditResponseHeaders(
  reply: FastifyReply,
  auditHeaders: Record<string, string>,
  request: FastifyRequest,
): void {
  for (const [name, value] of Object.entries(auditHeaders)) {
    reply.header(name, value);
  }

  const traceparent = normalizeHeaderValue(request.headers.traceparent);

  if (traceparent) {
    reply.header('traceparent', traceparent);
  }
}

function responseBytes(body: unknown): number | undefined {
  if (body === undefined) {
    return undefined;
  }

  return Buffer.byteLength(JSON.stringify(body));
}

async function captureOwnBffScreenAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaRoutesOptions,
  context: ResolvedAuthzContext,
  statusCode: number,
  body: unknown,
): Promise<boolean> {
  if (request.method !== 'GET' || statusCode < 200 || statusCode >= 300) {
    return false;
  }

  const classification = classifyScreenAuditRequest({
    method: request.method,
    path: request.url,
    screenIdHint: normalizeHeaderValue(request.headers['x-audit-screen-id']),
  });

  if (
    !classification.operation
    || (classification.level !== 'SILVER' && classification.level !== 'GOLD')
  ) {
    return false;
  }

  const auditHeaders = buildAuditHeaders(request, classification.operation);
  const event = buildScreenAccessEvent({
    request: {
      headers: {
        ...request.headers,
        ...auditHeaders,
      },
      id: request.id,
      ip: request.ip,
      method: request.method,
      url: request.url,
    },
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor: buildActor(context),
    auditLevel: classification.level,
    upstream: {
      name: 'mcad-bff',
      route: request.url,
      statusCode,
      body,
      responseBytes: responseBytes(body),
      capturedAtUtc: new Date().toISOString(),
    },
    screenAccessId: auditHeaders['x-audit-screen-access-id'],
  });

  try {
    await publishAuditEvent(event, {
      auditBaseUrl: options.config.auditBaseUrl,
      auditTimeoutMs: options.config.auditTimeoutMs,
      fetchImpl: options.fetchImpl as Parameters<typeof publishAuditEvent>[1]['fetchImpl'],
      log: request.log,
    });
  } catch (error) {
    request.log.error(
      {
        screenId: classification.operation.id,
        level: classification.level,
        err: error,
      },
      'audit.screen_access.bff_route_fail_closed',
    );
    reply.code(503).send({ code: AUDIT_UNAVAILABLE });
    return true;
  }

  addAuditResponseHeaders(reply, auditHeaders, request);
  return false;
}

async function sendOwnBffResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaRoutesOptions,
  context: ResolvedAuthzContext,
  statusCode: number,
  body: unknown,
) {
  const failedClosed = await captureOwnBffScreenAccess(
    request,
    reply,
    options,
    context,
    statusCode,
    body,
  );

  if (failedClosed) {
    return reply;
  }

  return reply.code(statusCode).send(body);
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

export async function registerAuditoriaRoutes(
  server: FastifyInstance,
  options: AuditoriaRoutesOptions,
): Promise<void> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const auditQueryClient = createAuditQueryClient(options.config, fetchImpl);

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

    const upstream = await auditQueryClient.fetchJsonFromRequest(
      request,
      ctx.token,
      correlationId,
      endpointPath,
    );
    const presentedBody = presentAuditEventsBody(upstream.body);
    const body = hasPermission(ctx, AUDITORIA_PERMISSIONS.snapshotView)
      ? presentedBody
      : redactSnapshots(presentedBody);

    return sendOwnBffResponse(request, reply, options, ctx, upstream.status, body);
  }

  async function handleFriendlyAuditList(request: FastifyRequest, reply: FastifyReply) {
    const ctx = await resolveAuthzContext(request, reply, options, fetchImpl);
    if (!ctx) return;

    if (!requirePermission(reply, ctx, AUDITORIA_PERMISSIONS.eventList)) {
      return;
    }

    const parsedQuery = parseAuditEventListQuery((request.query as Record<string, unknown>) ?? {});
    if (!parsedQuery.ok) {
      return sendError(reply, 400, 'INVALID_REQUEST', parsedQuery.message);
    }

    const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
    reply.header('x-correlation-id', correlationId);

    if (parsedQuery.query.auditLevel) {
      reply.header('x-audit-level-filter', 'client-side');
    }

    const upstream = await auditQueryClient.fetchJson(
      request,
      ctx.token,
      correlationId,
      '/audit/events',
      parsedQuery.query.upstreamParams,
    );
    const presentedBody = presentAuditEventsBody(upstream.body, {
      auditLevel: parsedQuery.query.auditLevel,
    });
    const body = hasPermission(ctx, AUDITORIA_PERMISSIONS.snapshotView)
      ? presentedBody
      : redactSnapshots(presentedBody);

    return sendOwnBffResponse(request, reply, options, ctx, upstream.status, body);
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

    const upstream = await auditQueryClient.fetchJsonFromRequest(
      request,
      ctx.token,
      correlationId,
      endpointPath,
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

    return sendOwnBffResponse(
      request,
      reply,
      options,
      ctx,
      upstream.status,
      presentAuditEvent(upstream.body),
    );
  }

  server.get('/api/auditoria/catalogo', handleCatalog);
  server.get('/api/auditoria/v1/catalogo', handleCatalog);
  server.get('/api/auditoria/eventos', handleFriendlyAuditList);
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
