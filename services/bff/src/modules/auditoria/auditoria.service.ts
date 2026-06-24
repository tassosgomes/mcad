import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import {
  type FetchLike,
  type ResolvedAuthzContext,
  resolveAuthzContext,
} from '../../shared/auth/authzContext.js';
import {
  hasPermission,
  requirePermission,
} from '../../shared/auth/permissionGuard.js';
import { buildScreenAccessActor } from '../../shared/audit/auditActor.js';
import {
  addAuditResponseHeaders,
  buildAuditHeaders,
} from '../../shared/audit/auditHeaders.js';
import type { AuditMetricsRegistry } from '../../shared/audit/auditMetrics.js';
import {
  auditLogContext,
  captureScreenAccess,
} from '../../shared/audit/screenAccessCapture.js';
import { AUDIT_CATALOG_VERSION, screenAuditCatalog } from '../../shared/audit/screenAuditCatalog.js';
import { classifyScreenAuditRequest } from '../../shared/audit/screenAuditClassifier.js';
import { toUuidCorrelationId } from '../../shared/http/correlationId.js';
import { sendError } from '../../shared/http/errors.js';
import { normalizeHeaderValue } from '../../shared/http/headers.js';
import {
  buildAuditServiceUrl,
  createAuditQueryClient,
  parseAuditEventListQuery,
} from './auditoria.client.js';
import {
  AUDITORIA_PERMISSIONS,
} from './auditoria.permissions.js';
import { presentAuditEvent, presentAuditEventsBody } from './auditoria.presenter.js';
import {
  buildUpstreamReportPayload,
  type FrontendCreateReportPayload,
  type UpstreamReportPayload,
} from './report.mapper.js';

export interface AuditoriaServiceOptions {
  config: BffConfig;
  fetchImpl: FetchLike;
  auditMetrics?: AuditMetricsRegistry;
}

const AUDIT_UNAVAILABLE = 'AUDIT_UNAVAILABLE';

function correlationIdFromHeader(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const candidate = raw && raw.trim() ? raw.trim() : fallback;
  return toUuidCorrelationId(candidate);
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

function responseBytes(body: unknown): number | undefined {
  if (body === undefined) {
    return undefined;
  }

  return Buffer.byteLength(JSON.stringify(body));
}

async function captureOwnBffScreenAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
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
  const screenIdHint = normalizeHeaderValue(request.headers['x-audit-screen-id']);

  if (classification.hint.status === 'ignored') {
    request.log.warn(
      auditLogContext(request, {
        method: request.method,
        url: request.url,
        screenIdHint,
        reason: classification.hint.reason,
      }),
      'audit.catalog.match_failed',
    );
  }

  if (
    !classification.operation
    || (classification.level !== 'SILVER' && classification.level !== 'GOLD')
  ) {
    if (screenIdHint && !classification.operation) {
      request.log.warn(
        auditLogContext(request, {
          method: request.method,
          url: request.url,
          screenIdHint,
          reason: 'unknown',
        }),
        'audit.catalog.match_failed',
      );
    }
    return false;
  }

  const auditHeaders = buildAuditHeaders(request, classification.operation);
  const bodyBytes = responseBytes(body);
  const captureResult = await captureScreenAccess({
    request,
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor: buildScreenAccessActor(context),
    auditLevel: classification.level,
    upstream: {
      name: 'mcad-bff',
      route: request.url,
      statusCode,
      body,
      responseBytes: bodyBytes,
      capturedAtUtc: new Date().toISOString(),
    },
    auditHeaders,
    options: {
      config: options.config,
      fetchImpl: options.fetchImpl as Parameters<typeof captureScreenAccess>[0]['options']['fetchImpl'],
      auditMetrics: options.auditMetrics,
    },
    failClosedLogMessage: 'audit.screen_access.bff_route_fail_closed',
  });

  if (!captureResult.ok) {
    reply.code(503).send({ code: AUDIT_UNAVAILABLE });
    return true;
  }

  addAuditResponseHeaders(reply, auditHeaders, request);
  return false;
}

async function sendOwnBffResponse(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
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

export async function handleCatalog(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!requirePermission(reply, ctx.payload.permissions, AUDITORIA_PERMISSIONS.catalogView)) {
    return;
  }

  return reply.send(buildCatalogResponse());
}

export async function handleAuditList(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
  endpointPath?: string,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!requirePermission(reply, ctx.payload.permissions, AUDITORIA_PERMISSIONS.eventList)) {
    return;
  }

  const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
  reply.header('x-correlation-id', correlationId);

  const auditQueryClient = createAuditQueryClient(options.config, options.fetchImpl);
  const upstream = await auditQueryClient.fetchJsonFromRequest(
    request,
    ctx.token,
    correlationId,
    endpointPath,
  );
  const presentedBody = presentAuditEventsBody(upstream.body);
  const body = hasPermission(ctx.payload.permissions, AUDITORIA_PERMISSIONS.snapshotView)
    ? presentedBody
    : redactSnapshots(presentedBody);

  return sendOwnBffResponse(request, reply, options, ctx, upstream.status, body);
}

export async function handleFriendlyAuditList(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!requirePermission(reply, ctx.payload.permissions, AUDITORIA_PERMISSIONS.eventList)) {
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

  const auditQueryClient = createAuditQueryClient(options.config, options.fetchImpl);
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
  const body = hasPermission(ctx.payload.permissions, AUDITORIA_PERMISSIONS.snapshotView)
    ? presentedBody
    : redactSnapshots(presentedBody);

  return sendOwnBffResponse(request, reply, options, ctx, upstream.status, body);
}

export async function handleAuditEventDetail(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
  endpointPath?: string,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  if (!requirePermission(reply, ctx.payload.permissions, AUDITORIA_PERMISSIONS.eventList)) {
    return;
  }

  const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
  reply.header('x-correlation-id', correlationId);

  const auditQueryClient = createAuditQueryClient(options.config, options.fetchImpl);
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
    && !hasPermission(ctx.payload.permissions, AUDITORIA_PERMISSIONS.snapshotView)
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

export async function handleCreateReport(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuditoriaServiceOptions,
): Promise<FastifyReply | void> {
  const ctx = await resolveAuthzContext(request, reply, options, options.fetchImpl);
  if (!ctx) return;

  const body = (request.body ?? {}) as FrontendCreateReportPayload;
  const result = buildUpstreamReportPayload(body, ctx.payload.user);
  if (!result.ok) {
    return sendError(reply, 400, 'INVALID_REQUEST', result.message);
  }

  const correlationId = correlationIdFromHeader(request.headers['x-correlation-id'], request.id);
  reply.header('x-correlation-id', correlationId);

  const url = buildAuditServiceUrl(options.config.auditBaseUrl, '/audit/reports');
  const upstream = await postAuditReport(
    request,
    options.fetchImpl,
    ctx.token,
    url,
    result.payload,
    correlationId,
    options.config.auditTimeoutMs,
  );

  return reply.code(upstream.status).send(upstream.body);
}
