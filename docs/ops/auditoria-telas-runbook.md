# Runbook - Auditoria de telas Prata/Ouro

Este runbook cobre o comportamento operacional do BFF quando telas classificadas como Prata ou Ouro dependem do `ecad-auditoria` para registrar `SCREEN_ACCESS`.

## Sinais de Alerta

- `bff_audit_fail_closed_total{level="GOLD"}` maior que zero.
- Crescimento anormal em `bff_audit_snapshot_bytes{screenId="..."}`.
- Ausencia de `bff_audit_screen_access_total{level="SILVER"}` ou `bff_audit_screen_access_total{level="GOLD"}` em telas classificadas e acessadas.
- Logs `audit.screen_access.publish_failed`, `audit.screen_access.fail_closed` ou `audit.screen_access.bff_route_fail_closed`.
- Logs `audit.catalog.match_failed` indicando hint de tela desconhecido, divergente de rota ou tentativa de reduzir criticidade.

## Comportamento Esperado

Telas Prata e Ouro falham fechadas. Se o upstream de dominio responde 2xx, mas o BFF nao consegue publicar o evento no `ecad-auditoria`, o BFF devolve:

```json
{ "code": "AUDIT_UNAVAILABLE" }
```

Esse bloqueio e intencional: evita expor dados sensiveis sem rastro auditavel.

## Triagem de `AUDIT_UNAVAILABLE`

1. Verificar saude e latencia do `ecad-auditoria`.
2. Confirmar conectividade do BFF para `AUDIT_BASE_URL`.
3. Procurar `audit.screen_access.publish_failed` pelo `requestId` ou `screenAccessId`.
4. Consultar `/metrics` no BFF e confirmar:
   - `bff_audit_publish_latency_ms_count`
   - `bff_audit_fail_closed_total{level="SILVER"}`
   - `bff_audit_fail_closed_total{level="GOLD"}`
5. Se a falha for em tela Ouro, escalar como incidente operacional.
6. Nao desabilitar auditoria Prata/Ouro nem rebaixar catalogo sem PR aprovado por produto/compliance.

## Queries Minimas

Prometheus:

```promql
increase(bff_audit_fail_closed_total{level="GOLD"}[5m]) > 0
increase(bff_audit_fail_closed_total[15m]) by (level)
sum by (screenId) (increase(bff_audit_snapshot_bytes[1h]))
sum by (level, screenId, outcome) (increase(bff_audit_screen_access_total[15m]))
rate(bff_audit_publish_latency_ms_sum[5m]) / rate(bff_audit_publish_latency_ms_count[5m])
```

Logs estruturados:

```text
message = "audit.screen_access.publish_failed"
message = "audit.screen_access.fail_closed"
message = "audit.screen_access.bff_route_fail_closed"
message = "audit.catalog.match_failed"
```

Campos para correlacao:

- `requestId`
- `screenAccessId`
- `traceId`
- `traceparent`
- `screenId`
- `level`

## Snapshots Ouro

- Snapshot Ouro so deve ser exibido via BFF para usuarios com `auditoria:default:snapshot:visualizar`.
- Logs nao devem conter `screen.businessContext.snapshot.body`.
- Na V1 nao ha mascaramento do corpo do snapshot; a protecao e controle de acesso e retencao.
- Retencao logica esperada: 90 dias nos eventos Prata/Ouro.

## Alteracao do Catalogo

O catalogo de criticidade muda via codigo/deploy. Para alterar classificacao:

1. Abrir PR alterando o catalogo governado.
2. Registrar justificativa, owner, aprovador e motivo.
3. Validar rotas/aliases e impacto de fail-closed.
4. Executar testes BFF/frontend relevantes.
5. Validar que telas Ouro continuam com permissao de snapshot restrita.

## Criterios Ouro

Use Ouro apenas quando a investigacao precisar reconstruir exatamente o payload retornado ao usuario. Exemplos iniciais obrigatorios:

- Cadastro - Titulares
- Arrecadacao - Pagamentos
- Arrecadacao - Verbas

Telas sem classificacao explicita continuam Bronze por default.
