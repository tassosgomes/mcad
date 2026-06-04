import type { FastifyRequest } from 'fastify';
import type { BffConfig } from '../config.js';
import type { FetchLike } from '../authzContext.js';
import { resolveAuditOperationByIdOrAlias } from './screenAuditClassifier.js';
import type { AuditLevel } from './screenAuditCatalog.js';

export interface AuditJsonResult {
  status: number;
  body?: unknown;
}

export interface AuditEventListQuery {
  upstreamParams: URLSearchParams;
  auditLevel?: AuditLevel;
}

export interface AuditQueryClient {
  fetchJsonFromRequest(
    request: FastifyRequest,
    token: string,
    correlationId: string,
    endpointPath?: string,
  ): Promise<AuditJsonResult>;
  fetchJson(
    request: FastifyRequest,
    token: string,
    correlationId: string,
    endpointPath: string,
    params?: URLSearchParams,
  ): Promise<AuditJsonResult>;
}

type ParseResult =
  | { ok: true; query: AuditEventListQuery }
  | { ok: false; message: string };

const BFF_AUDITORIA_V1_PREFIX = '/api/auditoria/v1';
const AUDIT_LEVELS = new Set<AuditLevel>(['BRONZE', 'SILVER', 'GOLD']);
const EVENT_TYPES = new Set(['SCREEN_ACCESS', 'USER_ACTION', 'DATA_CHANGE', 'MIXED']);
const QUERY_PARAM_ALIASES = new Map<string, string>([
  ['actorUserId', 'actorUserId'],
  ['userId', 'actorUserId'],
  ['usuario', 'actorUserId'],
  ['subject', 'subject'],
  ['screenId', 'screenId'],
  ['tela', 'screenId'],
  ['from', 'fromUtc'],
  ['fromUtc', 'fromUtc'],
  ['to', 'toUtc'],
  ['toUtc', 'toUtc'],
  ['entityType', 'entityType'],
  ['entityId', 'entityId'],
  ['context', 'businessCode'],
  ['businessCode', 'businessCode'],
  ['eventType', 'eventType'],
  ['page', 'page'],
  ['size', 'size'],
  ['sort', 'sort'],
  ['orderBy', 'orderBy'],
]);

function asStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

function normalizeAuditLevel(value: string): AuditLevel | undefined {
  const normalized = value.toUpperCase();
  const translated = {
    OURO: 'GOLD',
    PRATA: 'SILVER',
    BRONZE: 'BRONZE',
  }[normalized] as AuditLevel | undefined;

  return translated ?? (AUDIT_LEVELS.has(normalized as AuditLevel) ? normalized as AuditLevel : undefined);
}

function isValidInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isNonNegativeInteger(value: string): boolean {
  return /^\d+$/u.test(value);
}

function normalizeScreenId(value: string): string {
  return resolveAuditOperationByIdOrAlias(value)?.id ?? value;
}

function validateParam(upstreamName: string, value: string): string | undefined {
  if ((upstreamName === 'fromUtc' || upstreamName === 'toUtc') && !isValidInstant(value)) {
    return `${upstreamName} must be a valid ISO instant`;
  }

  if ((upstreamName === 'page' || upstreamName === 'size') && !isNonNegativeInteger(value)) {
    return `${upstreamName} must be a non-negative integer`;
  }

  if (upstreamName === 'eventType' && !EVENT_TYPES.has(value.toUpperCase())) {
    return 'eventType must be one of SCREEN_ACCESS, USER_ACTION, DATA_CHANGE, MIXED';
  }

  return undefined;
}

export function parseAuditEventListQuery(query: Record<string, unknown>): ParseResult {
  const upstreamParams = new URLSearchParams();
  let auditLevel: AuditLevel | undefined;

  for (const [rawName, rawValue] of Object.entries(query)) {
    const values = asStrings(rawValue);

    if (values.length === 0) {
      continue;
    }

    if (rawName === 'auditLevel' || rawName === 'nivel') {
      const parsedLevel = normalizeAuditLevel(values[0]!);

      if (!parsedLevel) {
        return { ok: false, message: 'auditLevel must be one of BRONZE, SILVER, GOLD' };
      }

      auditLevel = parsedLevel;
      continue;
    }

    const upstreamName = QUERY_PARAM_ALIASES.get(rawName);

    if (!upstreamName) {
      return { ok: false, message: `${rawName} is not a supported audit event filter` };
    }

    for (const value of values) {
      const validationError = validateParam(upstreamName, value);

      if (validationError) {
        return { ok: false, message: validationError };
      }

      upstreamParams.append(
        upstreamName,
        upstreamName === 'screenId' ? normalizeScreenId(value) : value,
      );
    }
  }

  return { ok: true, query: { upstreamParams, auditLevel } };
}

export function buildAuditServiceUrl(baseUrl: string, endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  if (baseUrl.endsWith('/audit') && normalizedPath.startsWith('/audit/')) {
    return `${baseUrl}${normalizedPath.slice('/audit'.length)}`;
  }

  return `${baseUrl}${normalizedPath}`;
}

export function buildAuditServiceUrlFromRequest(
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

function buildAuditServiceUrlWithParams(
  config: BffConfig,
  endpointPath: string,
  params?: URLSearchParams,
): string {
  const targetUrl = new URL(buildAuditServiceUrl(config.auditBaseUrl, endpointPath));
  targetUrl.search = params?.toString() ?? '';

  return targetUrl.toString();
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

export function createAuditQueryClient(
  config: BffConfig,
  fetchImpl: FetchLike,
): AuditQueryClient {
  return {
    fetchJsonFromRequest(request, token, correlationId, endpointPath) {
      return fetchAuditJson(
        request,
        fetchImpl,
        token,
        buildAuditServiceUrlFromRequest(config, request, endpointPath),
        correlationId,
        config.auditTimeoutMs,
      );
    },
    fetchJson(request, token, correlationId, endpointPath, params) {
      return fetchAuditJson(
        request,
        fetchImpl,
        token,
        buildAuditServiceUrlWithParams(config, endpointPath, params),
        correlationId,
        config.auditTimeoutMs,
      );
    },
  };
}
