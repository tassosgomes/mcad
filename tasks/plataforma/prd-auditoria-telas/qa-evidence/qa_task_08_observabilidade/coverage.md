# Evidencia - Task 8.0 Observabilidade e E2E

## Cobertura RF-01 a RF-08

| RF | Evidencia automatizada/documental |
| --- | --- |
| RF-01 Catalogo | Testes BFF de `/api/auditoria/catalogo`; E2E `auditoria.spec.ts` consulta catalogo e filtra Ouro. |
| RF-02 Bronze | Teste BFF `Bronze GET keeps the regular proxy path and does not call audit service`. |
| RF-03 Prata | Testes BFF de proxy SILVER sem snapshot e rota propria `auditoria.eventos.lista`. |
| RF-04 Ouro | Testes BFF de proxy GOLD com snapshot e smoke das tres telas Ouro obrigatorias. |
| RF-05 Consulta de eventos | Testes BFF de `/api/auditoria/eventos` e E2E de filtro/listagem. |
| RF-06 Governanca/minimizacao | Testes de 403 para snapshot sem permissao; logs do publisher sem body do snapshot; runbook operacional. |
| RF-07 Cobertura inicial por dominio | Testes smoke SILVER por Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria. |
| RF-08 Telas Ouro iniciais | Smoke BFF para Cadastro/Titulares, Arrecadacao/Pagamentos e Arrecadacao/Verbas. |

## Verificacoes adicionadas na task 8.0

- Metricas BFF em `/metrics`:
  - `bff_audit_screen_access_total{level,outcome,screenId}`
  - `bff_audit_snapshot_bytes{screenId}`
  - `bff_audit_publish_latency_ms`
  - `bff_audit_fail_closed_total{level}`
- Logs estruturados com correlacao:
  - `audit.screen_access.captured`
  - `audit.screen_access.publish_failed`
  - `audit.catalog.match_failed`
- E2E Playwright:
  - auditor consulta catalogo, filtra eventos e abre snapshot Ouro;
  - usuario sem `snapshot:visualizar` nao ve snapshot no DOM.

## Limitacoes operacionais

O E2E real depende de ambiente com frontend, Logto, BFF e `ecad-auditoria` disponiveis. Defina:

```text
AUDITORIA_E2E_AUDITOR_USER
AUDITORIA_E2E_AUDITOR_PASS
AUDITORIA_E2E_LIMITED_USER
AUDITORIA_E2E_LIMITED_PASS
AUDITORIA_E2E_GOLD_SCREEN_ID
AUDITORIA_E2E_GOLD_SCREEN_LABEL
AUDITORIA_E2E_GOLD_CONTEXT
```

Sem as quatro credenciais obrigatorias, o spec fica marcado como skip.
