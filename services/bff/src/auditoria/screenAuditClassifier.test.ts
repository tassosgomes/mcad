import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyScreenAuditRequest,
  resolveAuditOperationByIdOrAlias,
} from '../shared/audit/screenAuditClassifier.js';

test('unknown GET without explicit catalog entry resolves as default BRONZE', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/cadastro/v1/tela-sem-catalogo?page=0&size=10',
  });

  assert.equal(classification.level, 'BRONZE');
  assert.equal(classification.isDefault, true);
  assert.equal(classification.operation, undefined);
  assert.deepEqual(classification.businessContext.filters, {});
});

test('legacy aliases resolve to the canonical catalog operation', () => {
  const operation = resolveAuditOperationByIdOrAlias('ARRECADACAO_PAGAMENTOS');

  assert.equal(operation?.id, 'arrecadacao.pagamentos.lista');
  assert.equal(operation?.level, 'GOLD');
});

test('classified GOLD request extracts filters, pagination, sorting and business context', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/arrecadacao/v1/verbas/SDA/2026-05?page=2&size=50&sort=-valor&status=ABERTA',
    screenIdHint: 'ARRECADACAO_VERBAS',
  });

  assert.equal(classification.level, 'GOLD');
  assert.equal(classification.operation?.id, 'arrecadacao.verbas.lista');
  assert.equal(classification.isDefault, false);
  assert.equal(classification.matchedRoutePattern, '/api/arrecadacao/v1/verbas/:rubricaSigla/:periodo');
  assert.deepEqual(classification.routeParams, { rubricaSigla: 'SDA', periodo: '2026-05' });
  assert.deepEqual(classification.businessContext.pagination, { page: '2', size: '50' });
  assert.deepEqual(classification.businessContext.sorting, ['-valor']);
  assert.deepEqual(classification.businessContext.filters, { status: 'ABERTA' });
  assert.equal(classification.businessContext.entityType, 'Verba');
  assert.equal(classification.businessContext.entityId, 'SDA');
  assert.equal(classification.businessContext.businessCode, 'SDA');
  assert.deepEqual(classification.hint, {
    status: 'accepted',
    screenId: 'arrecadacao.verbas.lista',
  });
});

test('frontend hint cannot point to a route-incompatible screen or reduce route criticality', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/cadastro/v1/titulares?page=0&size=20&nome=Maria',
    screenIdHint: 'cadastro.associacoes.lista',
  });

  assert.equal(classification.level, 'GOLD');
  assert.equal(classification.operation?.id, 'cadastro.titulares.lista');
  assert.deepEqual(classification.hint, {
    status: 'ignored',
    screenId: 'cadastro.associacoes.lista',
    reason: 'route_mismatch',
  });
});

test('unknown frontend hint is ignored without changing default BRONZE classification', () => {
  const classification = classifyScreenAuditRequest({
    method: 'GET',
    path: '/api/desconhecida/v1/recurso',
    screenIdHint: 'tela.inexistente',
  });

  assert.equal(classification.level, 'BRONZE');
  assert.equal(classification.isDefault, true);
  assert.deepEqual(classification.hint, {
    status: 'ignored',
    screenId: 'tela.inexistente',
    reason: 'unknown',
  });
});
