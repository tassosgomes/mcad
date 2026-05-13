import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordAuditEvent, resetAuditEvents } from '../observability/audit-log.js';
import {
  getMetricsSnapshot,
  recordChatRequest,
  recordToolCall,
  resetMetrics,
} from '../observability/metrics.js';

test('metrics record chat, tool calls and authz denials', () => {
  resetMetrics();

  recordChatRequest(25);
  recordToolCall('buscarObra', 'success');
  recordToolCall('buscarTitular', 'denied');

  const snapshot = getMetricsSnapshot();

  assert.equal(snapshot.chatRequestsTotal, 1);
  assert.deepEqual(snapshot.chatLatencyMs, [25]);
  assert.equal(snapshot.toolCallsTotal.buscarObra.success, 1);
  assert.equal(snapshot.toolCallsTotal.buscarTitular.denied, 1);
  assert.equal(snapshot.authzDeniedTotal, 1);
});

test('audit records are sanitized before storage', () => {
  resetAuditEvents();

  const record = recordAuditEvent({
    requestId: 'request-1',
    userId: 'user-1',
    eventType: 'chat',
    target: 'mcad-operational-agent',
    status: 'success',
    metadata: {
      authorization: 'Bearer secret-token',
      prompt: 'cpf 123.456.789-10 email user@example.com',
    },
  });

  assert.equal(record.metadata?.authorization, '[REDACTED]');
  assert.equal(JSON.stringify(record).includes('secret-token'), false);
  assert.equal(JSON.stringify(record).includes('123.456.789-10'), false);
  assert.equal(JSON.stringify(record).includes('user@example.com'), false);
});
