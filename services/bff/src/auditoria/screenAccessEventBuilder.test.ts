import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FastifyRequest } from 'fastify';
import { buildScreenAccessEvent } from './screenAccessEventBuilder.js';
import { classifyScreenAuditRequest } from './screenAuditClassifier.js';
import { calculateSnapshotContentHash } from './snapshotHash.js';

function requestStub(overrides: Partial<Pick<FastifyRequest, 'headers' | 'id' | 'ip' | 'method' | 'url'>> = {}) {
  return {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-correlation-id': '11111111-1111-4111-8111-111111111111',
      'x-audit-session-id': 'session-123',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      ...overrides.headers,
    },
    id: 'req-123',
    ip: '203.0.113.10',
    method: 'GET',
    url: '/api/cadastro/v1/obras?page=2&size=20&senha=nao-capturar&titulo=Samba',
    ...overrides,
  } satisfies Pick<FastifyRequest, 'headers' | 'id' | 'ip' | 'method' | 'url'>;
}

const actor = {
  id: 'usr-123',
  subject: 'keycloak|usr-123',
  email: 'maria@ecad.org.br',
  name: 'Maria Silva',
  roles: ['cadastro.operador'],
};

test('buildScreenAccessEvent creates SILVER SCREEN_ACCESS without snapshot and without sensitive filters', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/cadastro/v1/obras?page=2&size=20&senha=nao-capturar&titulo=Samba',
  });

  assert.equal(classification.level, 'SILVER');
  assert.ok(classification.operation);

  const event = buildScreenAccessEvent({
    request: requestStub(),
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor,
    auditLevel: 'SILVER',
    screenAccessId: 'screen-access-123',
    occurredAtUtc: '2026-06-04T12:00:00.000Z',
    upstream: {
      name: 'cadastro',
      route: '/api/v1/obras?page=2&size=20&senha=nao-capturar&titulo=Samba',
      statusCode: 200,
      body: { id: 'obra-1', titulo: 'Samba' },
      responseBytes: 512,
    },
  });
  const businessContext = event.screen.businessContext;

  assert.equal(event.eventType, 'SCREEN_ACCESS');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.eventId, buildScreenAccessEvent({
    request: requestStub(),
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor,
    auditLevel: 'SILVER',
    screenAccessId: 'screen-access-123',
    occurredAtUtc: '2026-06-04T12:00:00.000Z',
    upstream: {
      name: 'cadastro',
      route: '/api/v1/obras',
      statusCode: 200,
    },
  }).eventId);
  assert.equal(event.actor.username, 'maria@ecad.org.br');
  assert.equal(event.origin.ip, '203.0.113.10');
  assert.equal(event.origin.screenId, 'cadastro.obras.lista');
  assert.equal(event.correlation.traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  assert.equal(event.correlation.userSessionId, 'session-123');
  assert.equal(event.metadata.auditLevel, 'SILVER');
  assert.equal(event.metadata.retentionDays, 90);
  assert.equal(event.metadata.responseBytes, 512);
  assert.equal(Object.prototype.hasOwnProperty.call(businessContext, 'snapshot'), false);
  assert.deepEqual(businessContext.filters, { titulo: 'Samba' });
});

test('buildScreenAccessEvent creates GOLD snapshot with allowed headers and deterministic hash', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/arrecadacao/v1/pagamentos?cpfCnpj=123&page=1&size=10',
    screenIdHint: 'ARRECADACAO_PAGAMENTOS',
  });

  assert.equal(classification.level, 'GOLD');
  assert.ok(classification.operation);

  const body = {
    items: [
      { id: 'pag-1', valor: 123.45, titular: { nome: 'Maria', documento: '123' } },
    ],
    total: 1,
  };
  const event = buildScreenAccessEvent({
    request: requestStub({
      url: '/api/arrecadacao/v1/pagamentos?cpfCnpj=123&page=1&size=10',
      headers: {
        authorization: 'Bearer nao-capturar',
        cookie: 'nao-capturar=true',
        'x-audit-screen-access-id': 'screen-access-gold',
      },
    }),
    operation: classification.operation,
    businessContext: classification.businessContext,
    actor,
    auditLevel: 'GOLD',
    occurredAtUtc: '2026-06-04T12:00:00.000Z',
    upstream: {
      name: 'arrecadacao',
      route: '/api/v1/pagamentos?cpfCnpj=123&page=1&size=10',
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer upstream-token',
        cookie: 'session=secret',
        'set-cookie': 'session=secret',
        'x-mcad-request-id': 'internal',
        'x-total-count': '1',
      },
      body,
      capturedAtUtc: '2026-06-04T12:00:01.000Z',
    },
  });
  const snapshot = event.screen.businessContext.snapshot as {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: unknown;
    capturedAtUtc: string;
    contentHash: string;
  };

  assert.equal(snapshot.statusCode, 200);
  assert.deepEqual(snapshot.body, body);
  assert.equal(snapshot.capturedAtUtc, '2026-06-04T12:00:01.000Z');
  assert.deepEqual(snapshot.headers, {
    'content-type': 'application/json',
    'x-total-count': '1',
  });
  assert.equal(
    snapshot.contentHash,
    calculateSnapshotContentHash({
      body,
      headers: {
        'content-type': 'application/json',
        'x-total-count': '1',
      },
      statusCode: 200,
    }),
  );
  assert.equal(JSON.stringify(snapshot.headers).includes('authorization'), false);
  assert.equal(JSON.stringify(snapshot.headers).includes('cookie'), false);
  assert.equal(event.correlation.screenAccessId, 'screen-access-gold');
});

test('calculateSnapshotContentHash is stable for equivalent JSON object key order', () => {
  const left = calculateSnapshotContentHash({
    statusCode: 200,
    headers: { 'x-total-count': '1', 'content-type': 'application/json' },
    body: { b: 2, a: { d: 4, c: 3 } },
  });
  const right = calculateSnapshotContentHash({
    body: { a: { c: 3, d: 4 }, b: 2 },
    headers: { 'content-type': 'application/json', 'x-total-count': '1' },
    statusCode: 200,
  });

  assert.equal(left, right);
});
