import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toUuidCorrelationId } from './shared/http/correlationId.js';

test('toUuidCorrelationId preserves a valid UUID v4', () => {
  const valid = '550e8400-e29b-41d4-a716-446655440000';
  assert.equal(toUuidCorrelationId(valid), valid);
});

test('toUuidCorrelationId replaces non-UUID seeds (e.g. Fastify req-id) with a fresh UUID', () => {
  const result = toUuidCorrelationId('req-4j');
  assert.match(result, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.notEqual(result, 'req-4j');
});
