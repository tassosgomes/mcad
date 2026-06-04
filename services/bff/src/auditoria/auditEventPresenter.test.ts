import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presentAuditEvent, presentAuditEventsBody } from './auditEventPresenter.js';

test('presentAuditEvent resolves legacy screen alias to canonical friendly catalog data', () => {
  const presented = presentAuditEvent({
    eventId: 'evt-1',
    payload: {
      screen: {
        screenId: 'CADASTRO_TITULARES',
        businessContext: { auditLevel: 'GOLD' },
      },
    },
  }) as {
    screen: { screenId: string; screenName: string; domain: string; auditLevel: string };
    catalog: { aliases: string[]; level: string };
  };

  assert.equal(presented.screen.screenId, 'cadastro.titulares.lista');
  assert.equal(presented.screen.screenName, 'Cadastro - Titulares');
  assert.equal(presented.screen.domain, 'cadastro');
  assert.equal(presented.screen.auditLevel, 'GOLD');
  assert.equal(presented.catalog.level, 'GOLD');
  assert.ok(presented.catalog.aliases.includes('CADASTRO_TITULARES'));
});

test('presentAuditEventsBody filters auditLevel client-side and documents limitation', () => {
  const body = presentAuditEventsBody(
    {
      items: [
        {
          eventId: 'evt-gold',
          metadata: { auditLevel: 'GOLD' },
          screen: { screenId: 'ARRECADACAO_PAGAMENTOS' },
        },
        {
          eventId: 'evt-silver',
          metadata: { auditLevel: 'SILVER' },
          screen: { screenId: 'cadastro.obras.lista' },
        },
      ],
      page: 0,
      size: 20,
    },
    { auditLevel: 'GOLD' },
  ) as {
    items: Array<{ eventId: string; screen: { screenId: string } }>;
    _meta: { auditLevelFilter: { mode: string; value: string } };
  };

  assert.deepEqual(body.items.map((item) => item.eventId), ['evt-gold']);
  assert.equal(body.items[0]?.screen.screenId, 'arrecadacao.pagamentos.lista');
  assert.deepEqual(body._meta.auditLevelFilter, {
    value: 'GOLD',
    mode: 'client-side',
    reason: 'audit-service-v1-does-not-expose-native-audit-level-filter',
  });
});
