import type { ScreenAccessAuditEvent } from './screenAccessEventBuilder.js';

export interface AuditEventPublisherOptions {
  auditBaseUrl: string;
  auditTimeoutMs: number;
  fetchImpl?: AuditEventFetch;
  log?: AuditEventLogger;
}

export interface AuditEventLogger {
  error(payload: Record<string, unknown>, message: string): void;
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
}

export interface AuditEventFetch {
  (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }): Promise<{
    status: number;
  }>;
}

export interface AuditPublishResult {
  eventId: string;
  status: number;
  latencyMs: number;
}

export class AuditEventPublishError extends Error {
  readonly code: 'AUDIT_EVENT_INVALID' | 'AUDIT_UNAVAILABLE';

  readonly eventId: string;

  readonly status?: number;

  readonly timeout: boolean;

  constructor(
    code: AuditEventPublishError['code'],
    eventId: string,
    options: { status?: number; timeout?: boolean } = {},
  ) {
    super(code);
    this.name = 'AuditEventPublishError';
    this.code = code;
    this.eventId = eventId;
    this.status = options.status;
    this.timeout = options.timeout ?? false;
  }
}

function buildAuditEventsUrl(auditBaseUrl: string): string {
  const normalizedBaseUrl = auditBaseUrl.replace(/\/$/, '');

  if (normalizedBaseUrl.endsWith('/api/v1/audit')) {
    return `${normalizedBaseUrl}/events`;
  }

  if (normalizedBaseUrl.endsWith('/api/v1')) {
    return `${normalizedBaseUrl}/audit/events`;
  }

  return `${normalizedBaseUrl}/api/v1/audit/events`;
}

function isValidScreenAccessEvent(event: ScreenAccessAuditEvent): boolean {
  return event.eventType === 'SCREEN_ACCESS'
    && event.schemaVersion === 1
    && event.eventId.trim().length > 0
    && Boolean(event.screen?.screenId)
    && Boolean(event.screen?.businessContext)
    && event.metadata.retentionDays === 90
    && (event.metadata.auditLevel === 'SILVER' || event.metadata.auditLevel === 'GOLD');
}

function logPayload(event: ScreenAccessAuditEvent, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: event.eventId,
    screenId: event.screen.screenId,
    level: event.metadata.auditLevel,
    ...extra,
  };
}

export async function publishAuditEvent(
  event: ScreenAccessAuditEvent,
  options: AuditEventPublisherOptions,
): Promise<AuditPublishResult> {
  const startedAt = Date.now();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (!isValidScreenAccessEvent(event)) {
    options.log?.warn(logPayload(event), 'audit.screen_access.payload_invalid');
    throw new AuditEventPublishError('AUDIT_EVENT_INVALID', event.eventId, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.auditTimeoutMs);
  const url = buildAuditEventsUrl(options.auditBaseUrl);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-correlation-id': event.correlation.requestId,
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (response.status >= 200 && response.status < 300) {
      options.log?.info(logPayload(event, { status: response.status, latencyMs }), 'audit.screen_access.captured');
      return {
        eventId: event.eventId,
        status: response.status,
        latencyMs,
      };
    }

    if (response.status === 400 || response.status === 422) {
      options.log?.warn(logPayload(event, { status: response.status, latencyMs }), 'audit.screen_access.payload_invalid');
      throw new AuditEventPublishError('AUDIT_EVENT_INVALID', event.eventId, { status: response.status });
    }

    options.log?.error(logPayload(event, { status: response.status, latencyMs }), 'audit.screen_access.publish_failed');
    throw new AuditEventPublishError('AUDIT_UNAVAILABLE', event.eventId, { status: response.status });
  } catch (error) {
    if (error instanceof AuditEventPublishError) {
      throw error;
    }

    const isTimeout = (error as { name?: string })?.name === 'AbortError';
    options.log?.error(
      logPayload(event, { timeout: isTimeout, latencyMs: Date.now() - startedAt }),
      'audit.screen_access.publish_failed',
    );
    throw new AuditEventPublishError('AUDIT_UNAVAILABLE', event.eventId, { timeout: isTimeout });
  } finally {
    clearTimeout(timer);
  }
}

export const auditEventPublisherInternals = {
  buildAuditEventsUrl,
};
