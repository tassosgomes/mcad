import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildAuditServiceUrl,
  parseAuditEventListQuery,
} from './auditQueryClient.js';

test('parseAuditEventListQuery maps friendly filters and canonicalizes screen aliases', () => {
  const result = parseAuditEventListQuery({
    usuario: 'user-1',
    tela: 'CADASTRO_TITULARES',
    from: '2026-06-01T00:00:00Z',
    to: '2026-06-04T00:00:00Z',
    entityType: 'Titular',
    entityId: 'tit-1',
    nivel: 'ouro',
    page: '0',
    size: '20',
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.query.auditLevel, 'GOLD');
  assert.equal(result.query.upstreamParams.toString(), [
    'actorUserId=user-1',
    'screenId=cadastro.titulares.lista',
    'fromUtc=2026-06-01T00%3A00%3A00Z',
    'toUtc=2026-06-04T00%3A00%3A00Z',
    'entityType=Titular',
    'entityId=tit-1',
    'page=0',
    'size=20',
  ].join('&'));
});

test('parseAuditEventListQuery rejects unsupported filters and invalid values', () => {
  assert.deepEqual(parseAuditEventListQuery({ senha: 'secret' }), {
    ok: false,
    message: 'senha is not a supported audit event filter',
  });
  assert.deepEqual(parseAuditEventListQuery({ auditLevel: 'PLATINUM' }), {
    ok: false,
    message: 'auditLevel must be one of BRONZE, SILVER, GOLD',
  });
  assert.deepEqual(parseAuditEventListQuery({ from: 'ontem' }), {
    ok: false,
    message: 'fromUtc must be a valid ISO instant',
  });
});

test('buildAuditServiceUrl adapts audit base urls with and without audit suffix', () => {
  assert.equal(
    buildAuditServiceUrl('http://audit.local/api/v1', '/audit/events'),
    'http://audit.local/api/v1/audit/events',
  );
  assert.equal(
    buildAuditServiceUrl('http://audit.local/api/v1/audit', '/audit/events'),
    'http://audit.local/api/v1/audit/events',
  );
});
