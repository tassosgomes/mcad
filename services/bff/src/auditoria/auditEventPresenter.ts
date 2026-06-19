import { resolveAuditOperationByIdOrAlias } from './screenAuditClassifier.js';
import type { AuditLevel, AuditScreenOperation } from './screenAuditCatalog.js';
import { screenAuditCatalog } from './screenAuditCatalog.js';

export interface PresentAuditEventsOptions {
  auditLevel?: AuditLevel;
}

type JsonRecord = Record<string, unknown>;

const AUDIT_LEVELS = new Set<AuditLevel>(['BRONZE', 'SILVER', 'GOLD']);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringAtPath(value: unknown, path: string[]): string | undefined {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.trim() ? current.trim() : undefined;
}

function firstStringAtPath(value: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    const candidate = stringAtPath(value, path);

    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeAuditLevel(value: string | undefined): AuditLevel | undefined {
  const normalized = value?.trim().toUpperCase();

  return normalized && AUDIT_LEVELS.has(normalized as AuditLevel)
    ? normalized as AuditLevel
    : undefined;
}

function resolveOperation(event: unknown): AuditScreenOperation | undefined {
  const screenId = firstStringAtPath(event, [
    ['screen', 'screenId'],
    ['screen', 'id'],
    ['origin', 'screenId'],
    ['metadata', 'screenId'],
    ['payload', 'screen', 'screenId'],
    ['payload', 'screen', 'id'],
    ['payload', 'origin', 'screenId'],
    ['payload', 'metadata', 'screenId'],
    ['screenId'],
  ]);

  return screenId ? resolveAuditOperationByIdOrAlias(screenId, screenAuditCatalog) : undefined;
}

function resolveEventAuditLevel(event: unknown, operation: AuditScreenOperation | undefined): AuditLevel | undefined {
  return normalizeAuditLevel(firstStringAtPath(event, [
    ['metadata', 'auditLevel'],
    ['screen', 'businessContext', 'auditLevel'],
    ['payload', 'metadata', 'auditLevel'],
    ['payload', 'screen', 'businessContext', 'auditLevel'],
    ['auditLevel'],
  ])) ?? operation?.level;
}

function catalogSummary(operation: AuditScreenOperation): JsonRecord {
  return {
    screenId: operation.id,
    aliases: operation.aliases,
    domain: operation.domain,
    friendlyName: operation.friendlyName,
    level: operation.level,
    justification: operation.justification,
  };
}

export function presentAuditEvent(event: unknown): unknown {
  if (!isRecord(event)) {
    return event;
  }

  const operation = resolveOperation(event);

  if (!operation) {
    return event;
  }

  const presented: JsonRecord = { ...event };
  const existingScreen = isRecord(event.screen) ? event.screen : {};

  presented.screen = {
    ...existingScreen,
    screenId: operation.id,
    screenName: operation.friendlyName,
    domain: operation.domain,
    auditLevel: resolveEventAuditLevel(event, operation),
  };
  presented.catalog = catalogSummary(operation);

  return presented;
}

function shouldKeepEvent(event: unknown, auditLevel: AuditLevel | undefined): boolean {
  if (!auditLevel) {
    return true;
  }

  return resolveEventAuditLevel(event, resolveOperation(event)) === auditLevel;
}

function presentEventArray(events: unknown[], options: PresentAuditEventsOptions): unknown[] {
  return events
    .filter((event) => shouldKeepEvent(event, options.auditLevel))
    .map((event) => presentAuditEvent(event));
}

function withClientSideFilterMeta(body: JsonRecord, auditLevel: AuditLevel | undefined): JsonRecord {
  if (!auditLevel) {
    return body;
  }

  return {
    ...body,
    _meta: {
      ...(isRecord(body._meta) ? body._meta : {}),
      auditLevelFilter: {
        value: auditLevel,
        mode: 'client-side',
        reason: 'audit-service-v1-does-not-expose-native-audit-level-filter',
      },
    },
  };
}

export function presentAuditEventsBody(body: unknown, options: PresentAuditEventsOptions = {}): unknown {
  if (Array.isArray(body)) {
    return presentEventArray(body, options);
  }

  if (!isRecord(body)) {
    return body;
  }

  const presented: JsonRecord = { ...body };

  if (Array.isArray(body.items)) {
    presented.items = presentEventArray(body.items, options);
  }

  if (Array.isArray(body.events)) {
    presented.events = presentEventArray(body.events, options);
  }

  if (Array.isArray(body.data)) {
    presented.data = presentEventArray(body.data, options);
  }

  return withClientSideFilterMeta(presented, options.auditLevel);
}
