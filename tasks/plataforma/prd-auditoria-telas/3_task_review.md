# Review da Tarefa 3.0 - Produtor HTTP e builder SCREEN_ACCESS no BFF

## Resultado da validacao automatizada

Status: APROVADA

Comandos executados:

```bash
rtk npm run build
```

Resultado: passou. O TypeScript compilou com `tsc -p tsconfig.json`.

```bash
rtk npm test
```

Resultado: passou. A suite `node --test dist/*.test.js dist/auditoria/*.test.js` executou 10 testes, com 10 aprovados, 0 falhas, 0 cancelados e 0 skipped.

Checks adicionais:

- `lint`: nao executado porque `services/bff/package.json` nao define script de lint.
- `typecheck`: coberto por `rtk npm run build`.

## Revisao tecnica

Artefatos revisados:

- `tasks/plataforma/prd-auditoria-telas/3_task.md`
- `tasks/plataforma/prd-auditoria-telas/prd.md`
- `tasks/plataforma/prd-auditoria-telas/techspec.md`
- `services/bff/src/auditoria/auditEventPublisher.ts`
- `services/bff/src/auditoria/auditEventPublisher.test.ts`
- `services/bff/src/auditoria/screenAccessEventBuilder.ts`
- `services/bff/src/auditoria/screenAccessEventBuilder.test.ts`
- `services/bff/src/auditoria/snapshotHash.ts`
- `services/bff/src/config.ts`
- `services/bff/src/config.test.ts`

Conformidade verificada:

- Publicacao HTTP em `POST {AUDIT_BASE_URL}/api/v1/audit/events`, aceitando base URL do servico, `/api/v1` ou `/api/v1/audit`.
- Timeout curto com `AbortController` e erro controlado `AUDIT_UNAVAILABLE`.
- Mapeamento de 400/422 para erro controlado `AUDIT_EVENT_INVALID`.
- Builder gera `eventType=SCREEN_ACCESS`, `origin`, `correlation`, `screen.businessContext` e `metadata`.
- `auditLevel`, `catalogVersion` e `retentionDays=90` sao registrados.
- Evento Prata nao inclui `snapshot`.
- Evento Ouro inclui `snapshot` com `statusCode`, headers permitidos, `body`, `capturedAtUtc` e `contentHash`.
- Headers sensiveis e internos sao removidos do snapshot; filtros sensiveis no contexto de negocio sao sanitizados.
- Hash de snapshot e deterministico para JSON equivalente com chaves em ordem diferente.
- Logs do publisher registram apenas metadados (`eventId`, `screenId`, nivel, status/latencia/timeout), sem corpo do snapshot.
- Testes cobrem publicacao HTTP, shape de evento, redaction, hash, retencao e timeout.

## Issues encontradas

Nenhuma issue bloqueante encontrada.

Observacao: nao foi alterado `docs/ai-dev/quality-ledger.md` porque a solicitacao desta validacao restringiu escrita apenas ao review report exigido.

## Recomendacao final

APROVADA
