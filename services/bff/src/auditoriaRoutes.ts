import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BffConfig } from './config.js';
import { type FetchLike, resolveAuthzContext, sendError } from './authzContext.js';
import { toUuidCorrelationId } from './correlationId.js';

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

  if (!fetchImpl) {
    throw new Error('No fetch implementation available for auditoria routes');
  }

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

    const url = `${options.config.auditBaseUrl}/audit/reports`;
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
