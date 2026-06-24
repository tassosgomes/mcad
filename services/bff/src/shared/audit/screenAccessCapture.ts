import type { FastifyBaseLogger, FastifyRequest } from 'fastify';
import type { BffConfig } from '../../config/config.js';
import {
  publishAuditEvent,
  type AuditEventPublisherOptions,
} from './auditEventPublisher.js';
import type {
  AuditMetricLevel,
  AuditMetricsRegistry,
  AuditScreenAccessOutcome,
} from './auditMetrics.js';
import {
  buildScreenAccessEvent,
  type ScreenAccessActor,
  type ScreenAccessAuditEvent,
  type ScreenAccessAuditLevel,
  type ScreenAccessUpstreamResponse,
} from './screenAccessEventBuilder.js';
import type { ExtractedBusinessContext } from './screenAuditClassifier.js';
import type { AuditScreenOperation } from './screenAuditCatalog.js';

export interface ScreenAccessCaptureOptions {
  config: Pick<BffConfig, 'auditBaseUrl' | 'auditTimeoutMs'>;
  fetchImpl?: AuditEventPublisherOptions['fetchImpl'];
  auditMetrics?: AuditMetricsRegistry;
}

export interface CaptureScreenAccessInput {
  request: FastifyRequest;
  operation: AuditScreenOperation;
  businessContext: ExtractedBusinessContext;
  actor: ScreenAccessActor;
  auditLevel: ScreenAccessAuditLevel;
  upstream: ScreenAccessUpstreamResponse;
  auditHeaders: Record<string, string>;
  options: ScreenAccessCaptureOptions;
  userToken?: string;
  failClosedLogMessage: string;
  failClosedLogExtra?: Record<string, unknown>;
}

export type ScreenAccessCaptureResult =
  | { ok: true; event: ScreenAccessAuditEvent }
  | { ok: false; event: ScreenAccessAuditEvent; error: unknown; latencyMs: number };

export function auditLogContext(
  request: FastifyRequest,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const traceparent = request.headers.traceparent;

  return {
    requestId: request.id,
    traceparent: Array.isArray(traceparent)
      ? traceparent.find((item) => item.trim().length > 0)
      : traceparent?.trim() || undefined,
    ...extra,
  };
}

export function recordScreenAccessMetric(
  auditMetrics: AuditMetricsRegistry | undefined,
  level: AuditMetricLevel,
  outcome: AuditScreenAccessOutcome,
  screenId: string,
): void {
  auditMetrics?.recordScreenAccess(level, outcome, screenId);

  if (outcome === 'fail_closed') {
    auditMetrics?.recordFailClosed(level);
  }
}

export async function captureScreenAccess(input: CaptureScreenAccessInput): Promise<ScreenAccessCaptureResult> {
  const event = buildScreenAccessEvent({
    request: {
      headers: {
        ...input.request.headers,
        ...input.auditHeaders,
      },
      id: input.request.id,
      ip: input.request.ip,
      method: input.request.method,
      url: input.request.url,
    },
    operation: input.operation,
    businessContext: input.businessContext,
    actor: input.actor,
    auditLevel: input.auditLevel,
    upstream: input.upstream,
    screenAccessId: input.auditHeaders['x-audit-screen-access-id'],
  });
  const publishStartedAt = Date.now();

  try {
    const publishResult = await publishAuditEvent(event, {
      auditBaseUrl: input.options.config.auditBaseUrl,
      auditTimeoutMs: input.options.config.auditTimeoutMs,
      userToken: input.userToken,
      fetchImpl: input.options.fetchImpl,
      log: input.request.log as FastifyBaseLogger,
    });
    input.options.auditMetrics?.recordPublishLatency(publishResult.latencyMs);
    recordScreenAccessMetric(input.options.auditMetrics, input.auditLevel, 'captured', input.operation.id);

    if (input.auditLevel === 'GOLD') {
      input.options.auditMetrics?.recordSnapshotBytes(input.operation.id, input.upstream.responseBytes);
    }

    return { ok: true, event };
  } catch (error) {
    const latencyMs = Date.now() - publishStartedAt;
    input.options.auditMetrics?.recordPublishLatency(latencyMs);
    recordScreenAccessMetric(input.options.auditMetrics, input.auditLevel, 'fail_closed', input.operation.id);
    input.request.log.error(
      auditLogContext(input.request, {
        ...input.failClosedLogExtra,
        screenId: input.operation.id,
        level: input.auditLevel,
        latencyMs,
        requestId: event.correlation.requestId,
        screenAccessId: event.correlation.screenAccessId,
        err: error,
      }),
      input.failClosedLogMessage,
    );

    return { ok: false, event, error, latencyMs };
  }
}
