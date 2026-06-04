import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FastifyRequest } from 'fastify';
import {
  AuditEventPublishError,
  auditEventPublisherInternals,
  publishAuditEvent,
  type AuditEventFetch,
} from './auditEventPublisher.js';
import { buildScreenAccessEvent } from './screenAccessEventBuilder.js';
import { classifyScreenAuditRequest } from './screenAuditClassifier.js';

function buildEvent() {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/arrecadacao/v1/verbas/SDA/2026-05?page=1&size=10',
  });

  assert.ok(classification.operation);

  return buildScreenAccessEvent({
    request: {
      headers: {
        'x-correlation-id': '22222222-2222-4222-8222-222222222222',
      },
      id: 'req-456',
      ip: '203.0.113.11',
      method: 'GET',
      url: '/api/arrecadacao/v1/verbas/SDA/2026-05?page=1&size=10',
    } satisfies Pick<FastifyRequest, 'headers' | 'id' | 'ip' | 'method' | 'url'>,
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor: {
      subject: 'keycloak|usr-456',
      email: 'joao@ecad.org.br',
    },
    auditLevel: 'GOLD',
    screenAccessId: 'screen-access-publisher',
    occurredAtUtc: '2026-06-04T12:00:00.000Z',
    upstream: {
      name: 'arrecadacao',
      route: '/api/v1/verbas/SDA/2026-05?page=1&size=10',
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
      },
      body: { rubrica: 'SDA', periodo: '2026-05', valores: [100] },
      capturedAtUtc: '2026-06-04T12:00:01.000Z',
    },
  });
}

function captureLog() {
  const records: Array<{ level: string; payload: Record<string, unknown>; message: string }> = [];

  return {
    records,
    log: {
      info(payload: Record<string, unknown>, message: string) {
        records.push({ level: 'info', payload, message });
      },
      warn(payload: Record<string, unknown>, message: string) {
        records.push({ level: 'warn', payload, message });
      },
      error(payload: Record<string, unknown>, message: string) {
        records.push({ level: 'error', payload, message });
      },
    },
  };
}

test('buildAuditEventsUrl accepts service, api v1 and audit base URLs', () => {
  assert.equal(
    auditEventPublisherInternals.buildAuditEventsUrl('http://audit.local'),
    'http://audit.local/api/v1/audit/events',
  );
  assert.equal(
    auditEventPublisherInternals.buildAuditEventsUrl('http://audit.local/api/v1'),
    'http://audit.local/api/v1/audit/events',
  );
  assert.equal(
    auditEventPublisherInternals.buildAuditEventsUrl('http://audit.local/api/v1/audit/'),
    'http://audit.local/api/v1/audit/events',
  );
});

test('publishAuditEvent posts SCREEN_ACCESS payload and logs only metadata', async () => {
  const event = buildEvent();
  const captured: { url?: string; body?: string; headers?: Record<string, string> } = {};
  const fetchImpl: AuditEventFetch = async (url, init) => {
    captured.url = url;
    captured.body = init?.body;
    captured.headers = init?.headers;
    return { status: 202 };
  };
  const logger = captureLog();

  const result = await publishAuditEvent(event, {
    auditBaseUrl: 'http://audit.local',
    auditTimeoutMs: 50,
    fetchImpl,
    log: logger.log,
  });

  assert.equal(result.eventId, event.eventId);
  assert.equal(result.status, 202);
  assert.equal(captured.url, 'http://audit.local/api/v1/audit/events');
  assert.equal(captured.headers?.['content-type'], 'application/json');
  assert.equal(captured.headers?.['x-correlation-id'], '22222222-2222-4222-8222-222222222222');
  assert.equal(JSON.parse(captured.body ?? '{}').eventType, 'SCREEN_ACCESS');
  assert.equal(logger.records[0]?.message, 'audit.screen_access.captured');
  assert.equal(JSON.stringify(logger.records).includes('rubrica'), false);
  assert.equal(JSON.stringify(logger.records).includes('valores'), false);
});

test('publishAuditEvent maps 400 and 422 to controlled invalid payload error', async () => {
  const event = buildEvent();
  const logger = captureLog();

  await assert.rejects(
    () => publishAuditEvent(event, {
      auditBaseUrl: 'http://audit.local/api/v1/audit',
      auditTimeoutMs: 50,
      fetchImpl: async () => ({ status: 422 }),
      log: logger.log,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuditEventPublishError);
      assert.equal(error.code, 'AUDIT_EVENT_INVALID');
      assert.equal(error.status, 422);
      return true;
    },
  );
  assert.equal(logger.records[0]?.message, 'audit.screen_access.payload_invalid');
});

test('publishAuditEvent maps upstream failure to controlled unavailable error', async () => {
  const event = buildEvent();
  const logger = captureLog();

  await assert.rejects(
    () => publishAuditEvent(event, {
      auditBaseUrl: 'http://audit.local/api/v1/audit',
      auditTimeoutMs: 50,
      fetchImpl: async () => ({ status: 503 }),
      log: logger.log,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuditEventPublishError);
      assert.equal(error.code, 'AUDIT_UNAVAILABLE');
      assert.equal(error.status, 503);
      return true;
    },
  );
  assert.equal(logger.records[0]?.message, 'audit.screen_access.publish_failed');
  assert.equal(JSON.stringify(logger.records).includes('valores'), false);
});

test('publishAuditEvent aborts timed out request and returns controlled unavailable error', async () => {
  const event = buildEvent();
  const logger = captureLog();
  const fetchImpl: AuditEventFetch = async (_url, init) => new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  });

  await assert.rejects(
    () => publishAuditEvent(event, {
      auditBaseUrl: 'http://audit.local/api/v1/audit',
      auditTimeoutMs: 1,
      fetchImpl,
      log: logger.log,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AuditEventPublishError);
      assert.equal(error.code, 'AUDIT_UNAVAILABLE');
      assert.equal(error.timeout, true);
      return true;
    },
  );
  assert.equal(logger.records[0]?.payload.timeout, true);
});
