import { randomUUID } from 'node:crypto';
import type { BffConfig } from '../../../config/config.js';
import type { FetchLike } from '../../../shared/auth/authzContext.js';

export interface PermissionLifecycleAuditEvent {
  eventType: 'PERMISSION_LIFECYCLE';
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  action: 'create' | 'deprecate' | 'reactivate' | 'remove';
  outcome: 'SUCCESS' | 'FAILURE';
  actor: { subject: string };
  permission: { id: string; key: string };
  correlationId: string;
  errorCode?: string;
}

export interface LifecycleAuditLogger {
  warn(payload: Record<string, unknown>, message: string): void;
}

export function buildPermissionLifecycleAuditEvent(input: Omit<
  PermissionLifecycleAuditEvent,
  'eventType' | 'schemaVersion' | 'eventId' | 'occurredAt'
>): PermissionLifecycleAuditEvent {
  return {
    eventType: 'PERMISSION_LIFECYCLE',
    schemaVersion: 1,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    ...input,
  };
}

function buildAuditEventsUrl(auditBaseUrl: string): string {
  const normalized = auditBaseUrl.replace(/\/$/, '');
  if (normalized.endsWith('/api/v1/audit')) return `${normalized}/events`;
  if (normalized.endsWith('/api/v1')) return `${normalized}/audit/events`;
  return `${normalized}/api/v1/audit/events`;
}

export async function firePermissionLifecycleAuditEvent(
  event: PermissionLifecycleAuditEvent,
  options: {
    config: BffConfig;
    fetchImpl: FetchLike;
    log: LifecycleAuditLogger;
  },
): Promise<void> {
  const url = buildAuditEventsUrl(options.config.auditBaseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.config.auditTimeoutMs);

  try {
    await options.fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': event.correlationId,
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
  } catch (error) {
    options.log.warn(
      { err: error, eventId: event.eventId },
      'permission.lifecycle.audit.publish_failed',
    );
  } finally {
    clearTimeout(timer);
  }
}
