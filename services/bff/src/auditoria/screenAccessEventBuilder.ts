import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import type { ExtractedBusinessContext } from './screenAuditClassifier.js';
import type { AuditScreenOperation } from './screenAuditCatalog.js';
import { AUDIT_RETENTION_DAYS } from './screenAuditCatalog.js';
import { calculateSnapshotContentHash } from './snapshotHash.js';

export type ScreenAccessAuditLevel = 'SILVER' | 'GOLD';

export interface ScreenAccessActor {
  id?: string;
  subject: string;
  username?: string;
  email?: string;
  name?: string;
  roles?: string[];
  authProvider?: string;
}

export interface ScreenAccessUpstreamResponse {
  name: string;
  route: string;
  statusCode: number;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  responseBytes?: number;
  capturedAtUtc?: string;
}

export interface BuildScreenAccessEventInput {
  request: Pick<FastifyRequest, 'headers' | 'id' | 'ip' | 'method' | 'url'>;
  operation: AuditScreenOperation;
  businessContext: ExtractedBusinessContext;
  actor: ScreenAccessActor;
  auditLevel: ScreenAccessAuditLevel;
  upstream: ScreenAccessUpstreamResponse;
  eventId?: string;
  screenAccessId?: string;
  occurredAtUtc?: string;
  environment?: string;
}

export interface ScreenAccessSnapshot {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: unknown;
  capturedAtUtc: string;
  contentHash: string;
}

export interface ScreenAccessAuditEvent {
  eventId: string;
  schemaVersion: 1;
  eventType: 'SCREEN_ACCESS';
  occurredAt: string;
  source: {
    service: 'mcad-bff';
    system: 'mcad';
    schema: 'bff';
    environment: string;
  };
  actor: {
    userId?: string;
    username: string;
    displayName?: string;
    actorType: 'USER';
    roles: string[];
    authProvider: string;
  };
  origin: {
    channel: 'WEB';
    ip?: string;
    userAgent?: string;
    route: string;
    screenId: string;
    screenName: string;
  };
  correlation: {
    traceId?: string;
    requestId: string;
    userSessionId?: string;
    screenAccessId: string;
  };
  security: {
    sensitivity: 'INTERNAL';
    redactedFields: string[];
  };
  metadata: {
    auditLevel: ScreenAccessAuditLevel;
    catalogVersion: string;
    retentionDays: 90;
    sourceRoute: string;
    upstreamName: string;
    upstreamRoute: string;
    upstreamStatusCode: number;
    responseBytes?: number;
  };
  screen: {
    screenId: string;
    screenName: string;
    businessContext: Record<string, unknown>;
  };
}

const SENSITIVE_KEY_PATTERN = /(^|[-_.])(authorization|cookie|password|senha|secret|token|access-token|refresh-token|api-key)([-_.]|$)/i;
const INTERNAL_HEADER_PREFIXES = ['x-mcad-', 'x-internal-', 'x-runtime-', 'x-authz-'];
const SNAPSHOT_HEADER_ALLOWLIST = new Set([
  'content-type',
  'content-language',
  'etag',
  'last-modified',
  'x-page',
  'x-page-size',
  'x-total-count',
  'x-total-pages',
]);

function getFirstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0);
  }

  return value?.trim() || undefined;
}

function headerValue(request: BuildScreenAccessEventInput['request'], name: string): string | undefined {
  return getFirstHeaderValue(request.headers[name.toLowerCase()]);
}

function parseTraceParent(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parts = value.split('-');
  const traceId = parts[1];

  return traceId && /^[0-9a-f]{32}$/i.test(traceId) ? traceId : value;
}

function deterministicUuid(source: string): string {
  const hash = createHash('sha256').update(source).digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function sanitizeContextValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeContextValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      continue;
    }
    sanitized[key] = sanitizeContextValue(raw);
  }

  return sanitized;
}

function sanitizeBusinessContext(context: ExtractedBusinessContext): Record<string, unknown> {
  return sanitizeContextValue(context) as Record<string, unknown>;
}

function isInternalHeader(name: string): boolean {
  return INTERNAL_HEADER_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function sanitizeSnapshotHeaders(
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {};

  for (const [rawName, rawValue] of Object.entries(headers ?? {})) {
    const name = rawName.toLowerCase();

    if (
      rawValue === undefined
      || !SNAPSHOT_HEADER_ALLOWLIST.has(name)
      || isSensitiveKey(name)
      || isInternalHeader(name)
    ) {
      continue;
    }

    sanitized[name] = rawValue;
  }

  return sanitized;
}

function buildSnapshot(upstream: ScreenAccessUpstreamResponse): ScreenAccessSnapshot {
  const snapshotBase = {
    statusCode: upstream.statusCode,
    headers: sanitizeSnapshotHeaders(upstream.headers),
    body: upstream.body,
  };

  return {
    ...snapshotBase,
    capturedAtUtc: upstream.capturedAtUtc ?? new Date().toISOString(),
    contentHash: calculateSnapshotContentHash(snapshotBase),
  };
}

function resolveScreenAccessId(input: BuildScreenAccessEventInput): string {
  return input.screenAccessId
    ?? headerValue(input.request, 'x-audit-screen-access-id')
    ?? deterministicUuid(`${input.request.id}:${input.request.method}:${input.request.url}:${input.operation.id}`);
}

function buildEventId(input: BuildScreenAccessEventInput, screenAccessId: string): string {
  return input.eventId ?? deterministicUuid(`SCREEN_ACCESS:${screenAccessId}`);
}

function buildBusinessContext(input: BuildScreenAccessEventInput): Record<string, unknown> {
  const businessContext = sanitizeBusinessContext(input.businessContext);

  if (input.auditLevel === 'GOLD') {
    businessContext.snapshot = buildSnapshot(input.upstream);
  } else {
    delete businessContext.snapshot;
  }

  return businessContext;
}

export function buildScreenAccessEvent(input: BuildScreenAccessEventInput): ScreenAccessAuditEvent {
  const screenAccessId = resolveScreenAccessId(input);
  const requestId = headerValue(input.request, 'x-correlation-id') ?? input.request.id;
  const userSessionId = headerValue(input.request, 'x-audit-session-id') ?? headerValue(input.request, 'x-session-id');
  const traceId = parseTraceParent(headerValue(input.request, 'traceparent')) ?? requestId;
  const userAgent = headerValue(input.request, 'user-agent');
  const username = input.actor.username ?? input.actor.email ?? input.actor.subject;
  const businessContext = buildBusinessContext(input);

  return {
    eventId: buildEventId(input, screenAccessId),
    schemaVersion: 1,
    eventType: 'SCREEN_ACCESS',
    occurredAt: input.occurredAtUtc ?? new Date().toISOString(),
    source: {
      service: 'mcad-bff',
      system: 'mcad',
      schema: 'bff',
      environment: input.environment ?? process.env.NODE_ENV ?? 'local',
    },
    actor: {
      userId: input.actor.id,
      username,
      displayName: input.actor.name,
      actorType: 'USER',
      roles: input.actor.roles ?? [],
      authProvider: input.actor.authProvider ?? 'ecad-authz',
    },
    origin: {
      channel: 'WEB',
      ip: input.request.ip,
      userAgent,
      route: input.request.url,
      screenId: input.operation.id,
      screenName: input.operation.friendlyName,
    },
    correlation: {
      traceId,
      requestId,
      userSessionId,
      screenAccessId,
    },
    security: {
      sensitivity: 'INTERNAL',
      redactedFields: [],
    },
    metadata: {
      auditLevel: input.auditLevel,
      catalogVersion: input.businessContext.catalogVersion,
      retentionDays: AUDIT_RETENTION_DAYS,
      sourceRoute: input.request.url,
      upstreamName: input.upstream.name,
      upstreamRoute: input.upstream.route,
      upstreamStatusCode: input.upstream.statusCode,
      responseBytes: input.upstream.responseBytes,
    },
    screen: {
      screenId: input.operation.id,
      screenName: input.operation.friendlyName,
      businessContext,
    },
  };
}
