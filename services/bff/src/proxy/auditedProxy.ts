import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BffConfig, UpstreamConfig } from '../config/config.js';
import {
  resolveAuthzContext,
  type FetchLike,
} from '../shared/auth/authzContext.js';
import { buildScreenAccessActor } from '../shared/audit/auditActor.js';
import {
  addAuditResponseHeaders,
  buildAuditHeaders,
} from '../shared/audit/auditHeaders.js';
import type { AuditMetricsRegistry } from '../shared/audit/auditMetrics.js';
import {
  auditLogContext,
  captureScreenAccess,
  recordScreenAccessMetric,
} from '../shared/audit/screenAccessCapture.js';
import { classifyScreenAuditRequest } from '../shared/audit/screenAuditClassifier.js';
import { normalizeHeaderValue } from '../shared/http/headers.js';
import {
  buildAuditedFetchHeaders,
} from './proxyHeaders.js';
import {
  buildTargetUrl,
  buildUpstreamRoute,
  type ProxyTarget,
} from './proxyTarget.js';
import {
  copyUpstreamResponseHeaders,
  isJsonContentType,
  readResponseBody,
  readResponseBodyWithLimit,
  responseHeaders,
} from './responseBody.js';

export interface AuditedProxyOptions {
  config: BffConfig;
  fetchImpl?: FetchLike;
  auditMetrics?: AuditMetricsRegistry;
}

const AUDIT_RESPONSE_NOT_JSON = 'AUDIT_RESPONSE_NOT_JSON';
const AUDIT_RESPONSE_TOO_LARGE = 'AUDIT_RESPONSE_TOO_LARGE';
const AUDIT_UNAVAILABLE = 'AUDIT_UNAVAILABLE';
const AUDITED_UPSTREAM_NAMES = new Set([
  'cadastro',
  'arrecadacao',
  'identificacao',
  'distribuicao',
  'auditoria',
]);

function sendProxyError(reply: FastifyReply, status: number, code: string): void {
  reply.code(status).send({ code });
}

function logCatalogMatchFailure(
  request: FastifyRequest,
  upstreamConfig: UpstreamConfig,
  screenIdHint: string | undefined,
  reason: string | undefined,
): void {
  request.log.warn(
    auditLogContext(request, {
      upstream: upstreamConfig.name,
      method: request.method,
      url: request.url,
      screenIdHint,
      reason: reason ?? 'no_catalog_match',
    }),
    'audit.catalog.match_failed',
  );
}

function shouldAuditScreenAccess(upstreamConfig: UpstreamConfig, request: FastifyRequest): boolean {
  return request.method === 'GET' && AUDITED_UPSTREAM_NAMES.has(upstreamConfig.name);
}

export async function handleAuditedScreenAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  upstreamConfig: UpstreamConfig,
  target: ProxyTarget,
  options: AuditedProxyOptions,
  fetchImpl: FetchLike,
): Promise<boolean> {
  if (!shouldAuditScreenAccess(upstreamConfig, request)) {
    return false;
  }

  const classification = classifyScreenAuditRequest({
    method: request.method,
    path: request.url,
    screenIdHint: normalizeHeaderValue(request.headers['x-audit-screen-id']),
  });
  const screenIdHint = normalizeHeaderValue(request.headers['x-audit-screen-id']);

  if (classification.hint.status === 'ignored') {
    logCatalogMatchFailure(request, upstreamConfig, screenIdHint, classification.hint.reason);
  }

  if (
    !classification.operation
    || (classification.level !== 'SILVER' && classification.level !== 'GOLD')
  ) {
    if (screenIdHint && !classification.operation) {
      logCatalogMatchFailure(request, upstreamConfig, screenIdHint, 'unknown');
    }
    return false;
  }

  const resolvedAuthz = await resolveAuthzContext(request, reply, options, fetchImpl);

  if (!resolvedAuthz) {
    return true;
  }

  const auditHeaders = buildAuditHeaders(request, classification.operation);
  const targetUrl = buildTargetUrl(request.url, upstreamConfig.prefix, target);
  const upstreamRoute = buildUpstreamRoute(request.url, upstreamConfig.prefix, target);
  const proxyFetch = (options.fetchImpl ?? globalThis.fetch) as unknown as typeof globalThis.fetch;
  const upstreamResponse = await proxyFetch(targetUrl, {
    method: request.method,
    headers: {
      ...buildAuditedFetchHeaders(request, request.headers, upstreamConfig.name),
      ...auditHeaders,
      ...(normalizeHeaderValue(request.headers.traceparent)
        ? { traceparent: normalizeHeaderValue(request.headers.traceparent) as string }
        : {}),
    },
  });
  const responseHeadersRecord = responseHeaders(upstreamResponse);

  if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
    const body = await readResponseBody(upstreamResponse);

    copyUpstreamResponseHeaders(reply, upstreamResponse);
    reply.code(upstreamResponse.status);
    reply.send(body);
    return true;
  }

  const contentType = upstreamResponse.headers.get('content-type');

  if (!isJsonContentType(contentType)) {
    request.log.warn(
      auditLogContext(request, {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
        contentType,
        screenId: classification.operation.id,
        level: classification.level,
        screenAccessId: auditHeaders['x-audit-screen-access-id'],
      }),
      'audit.screen_access.non_json_response',
    );
    recordScreenAccessMetric(
      options.auditMetrics,
      classification.level,
      'response_not_json',
      classification.operation.id,
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_NOT_JSON);
    return true;
  }

  const { buffer, exceeded } = await readResponseBodyWithLimit(
    upstreamResponse,
    options.config.auditScreenAccessMaxResponseBytes,
  );

  if (exceeded) {
    request.log.warn(
      auditLogContext(request, {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
        maxBytes: options.config.auditScreenAccessMaxResponseBytes,
        screenId: classification.operation.id,
        level: classification.level,
        screenAccessId: auditHeaders['x-audit-screen-access-id'],
      }),
      'audit.screen_access.response_too_large',
    );
    recordScreenAccessMetric(
      options.auditMetrics,
      classification.level,
      'response_too_large',
      classification.operation.id,
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_TOO_LARGE);
    return true;
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(buffer.toString('utf8'));
  } catch {
    request.log.warn(
      auditLogContext(request, {
        upstream: upstreamConfig.name,
        statusCode: upstreamResponse.status,
        method: request.method,
        url: request.url,
        screenId: classification.operation.id,
        level: classification.level,
        screenAccessId: auditHeaders['x-audit-screen-access-id'],
      }),
      'audit.screen_access.invalid_json_response',
    );
    recordScreenAccessMetric(
      options.auditMetrics,
      classification.level,
      'invalid_json',
      classification.operation.id,
    );
    sendProxyError(reply, 502, AUDIT_RESPONSE_NOT_JSON);
    return true;
  }

  const captureResult = await captureScreenAccess({
    request,
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor: buildScreenAccessActor(resolvedAuthz),
    auditLevel: classification.level,
    upstream: {
      name: upstreamConfig.name,
      route: upstreamRoute,
      statusCode: upstreamResponse.status,
      headers: responseHeadersRecord,
      body: parsedBody,
      responseBytes: buffer.byteLength,
      capturedAtUtc: new Date().toISOString(),
    },
    auditHeaders,
    options: {
      config: options.config,
      fetchImpl: options.fetchImpl as Parameters<typeof captureScreenAccess>[0]['options']['fetchImpl'],
      auditMetrics: options.auditMetrics,
    },
    userToken: resolvedAuthz.token,
    failClosedLogMessage: 'audit.screen_access.fail_closed',
    failClosedLogExtra: {
      upstream: upstreamConfig.name,
    },
  });

  if (!captureResult.ok) {
    sendProxyError(reply, 503, AUDIT_UNAVAILABLE);
    return true;
  }

  copyUpstreamResponseHeaders(reply, upstreamResponse);
  addAuditResponseHeaders(reply, auditHeaders, request);
  reply.code(upstreamResponse.status);
  reply.send(buffer);
  return true;
}
