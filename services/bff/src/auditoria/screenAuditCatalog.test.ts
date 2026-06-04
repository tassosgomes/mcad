import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUDIT_RETENTION_DAYS,
  CATALOG_GOVERNANCE_NOTE,
  auditCatalogCoverageBacklog,
  findDuplicateRouteMethodRules,
  screenAuditCatalog,
} from './screenAuditCatalog.js';

const mandatoryGoldScreens = [
  { id: 'cadastro.titulares.lista', alias: 'CADASTRO_TITULARES' },
  { id: 'arrecadacao.pagamentos.lista', alias: 'ARRECADACAO_PAGAMENTOS' },
  { id: 'arrecadacao.verbas.lista', alias: 'ARRECADACAO_VERBAS' },
];

test('catalog marks mandatory initial screens as GOLD with legacy aliases and 90 day retention', () => {
  for (const expected of mandatoryGoldScreens) {
    const operation = screenAuditCatalog.find((entry) => entry.id === expected.id);

    assert.ok(operation, `${expected.id} should exist in audit catalog`);
    assert.equal(operation.level, 'GOLD');
    assert.equal(operation.retentionDays, AUDIT_RETENTION_DAYS);
    assert.ok(operation.aliases.includes(expected.alias));
    assert.ok(operation.justification.length > 0);
    assert.ok(operation.owner.length > 0);
    assert.ok(operation.approvedBy.length > 0);
  }
});

test('catalog contains the initial governed domains', () => {
  const domains = new Set(screenAuditCatalog.map((entry) => entry.domain));

  assert.deepEqual(domains, new Set(['cadastro', 'identificacao', 'arrecadacao', 'distribuicao', 'auditoria']));
});

test('SILVER and GOLD operations have governance metadata and 90 day retention', () => {
  const sensitiveOperations = screenAuditCatalog.filter((entry) => entry.level !== 'BRONZE');

  assert.ok(sensitiveOperations.length > mandatoryGoldScreens.length);

  for (const operation of sensitiveOperations) {
    assert.equal(operation.retentionDays, AUDIT_RETENTION_DAYS, operation.id);
    assert.ok(operation.justification.trim().length > 0, operation.id);
    assert.ok(operation.owner.trim().length > 0, operation.id);
    assert.ok(operation.approvedBy.trim().length > 0, operation.id);
    assert.match(operation.approvedAt, /^\d{4}-\d{2}-\d{2}$/u, operation.id);
    assert.ok(operation.changeReason.trim().length > 0, operation.id);
  }
});

test('catalog does not duplicate route and method rules', () => {
  assert.deepEqual(findDuplicateRouteMethodRules(), []);
});

test('catalog ids and aliases are unique after normalization', () => {
  const identifiers = new Map<string, string>();

  for (const operation of screenAuditCatalog) {
    for (const identifier of [operation.id, ...operation.aliases]) {
      const normalizedIdentifier = identifier.toLowerCase();
      const previousOwner = identifiers.get(normalizedIdentifier);

      assert.equal(previousOwner, undefined, `${identifier} already belongs to ${previousOwner ?? 'unknown'}`);
      identifiers.set(normalizedIdentifier, operation.id);
    }
  }
});

test('catalog documents PR and deploy governance', () => {
  assert.match(CATALOG_GOVERNANCE_NOTE, /pull request/i);
  assert.match(CATALOG_GOVERNANCE_NOTE, /deploy/i);
  assert.match(CATALOG_GOVERNANCE_NOTE, /Git/i);
});

test('catalog covers real sensitive route variants discovered for initial domains', () => {
  const routesByOperation = new Map(
    screenAuditCatalog.map((operation) => [operation.id, new Set(operation.routePatterns)]),
  );

  assert.ok(routesByOperation.get('cadastro.titularidades.lista')?.has('/api/cadastro/v1/obras/:obraId/titularidades'));
  assert.ok(routesByOperation.get('identificacao.captacoes.lista')?.has('/api/identificacao/v1/captacoes/:captacaoId/uploads'));
  assert.ok(routesByOperation.get('arrecadacao.licencas.lista')?.has('/api/arrecadacao/v1/licencas/:id/historico-status'));
  assert.ok(routesByOperation.get('arrecadacao.uda.lista')?.has('/api/arrecadacao/v1/uda/vigente'));
  assert.ok(routesByOperation.get('auditoria.eventos.lista')?.has('/api/auditoria/eventos/:eventId'));
});

test('catalog exposes explicit backlog for PRD screens not present in current routes', () => {
  assert.ok(auditCatalogCoverageBacklog.length > 0);

  for (const item of auditCatalogCoverageBacklog) {
    assert.ok(item.domain.trim().length > 0);
    assert.ok(item.screen.trim().length > 0);
    assert.ok(item.reason.trim().length > 0);
    assert.notEqual(item.expectedMinimumLevel, 'BRONZE');
  }
});
