---
status: pending
parallelizable: false
blocked_by: ["2.0", "4.0", "5.0", "6.0", "7.0"]
---

<task_context>
<domain>plataforma/auditoria/validacao</domain>
<type>testing</type>
<scope>performance</scope>
<complexity>high</complexity>
<dependencies>http_server,external_apis,database</dependencies>
<unblocks></unblocks>
</task_context>

# Tarefa 8.0: Fechar observabilidade, documentacao e validacao E2E

## Relacionada as User Stories

- Auditor consegue usar o fluxo completo de investigacao.
- Compliance tem garantia de acesso restrito a snapshots.
- Operacao consegue detectar falha de auditoria em telas sensiveis.

## Visao Geral

Fechar a entrega com metricas, logs, tracing, documentacao operacional, testes integrados e E2E. Validar que Prata/Ouro falham fechados quando a auditoria esta indisponivel e que snapshots Ouro nao sao expostos sem permissao.

## Requisitos

- Criar metricas BFF para total capturado, bytes de snapshot, latencia de publicacao e fail-closed.
- Criar logs estruturados sem body de snapshot.
- Propagar `traceparent`, `screenAccessId` e `requestId` em logs do BFF e chamadas de dominio.
- Criar dashboards/alertas ou documentar queries operacionais minimas.
- Criar E2E Playwright para catalogo, eventos, snapshot autorizado e snapshot negado.
- Documentar runbook para `AUDIT_UNAVAILABLE` em Prata/Ouro.
- Registrar evolucoes futuras no backlog: filtro nativo por nivel no `ecad-auditoria` e purge fisico de 90 dias.

## Arquivos Envolvidos

- **Modificar/Criar:**
  - `services/bff/src/*` arquivos de observabilidade/config relacionados
  - `frontend/src/features/auditoria/**` testes E2E ou fixtures
  - `docs/*` ou README operacional de auditoria
  - `tasks/plataforma/prd-auditoria-telas/qa-evidence/*`, se o fluxo QA do projeto usar evidencias
  - Configuracao de Playwright existente, se houver
- **Referencia:**
  - `tasks/plataforma/prd-auditoria-telas/prd.md`
  - `tasks/plataforma/prd-auditoria-telas/techspec.md`
  - `services/bff/src/correlationId.ts`
  - `frontend/src/test/setup.ts`

## Subtarefas

- [ ] 8.1 Adicionar metricas `bff_audit_screen_access_total{level,outcome,screenId}`, `bff_audit_snapshot_bytes{screenId}`, `bff_audit_publish_latency_ms` e `bff_audit_fail_closed_total{level}`.
- [ ] 8.2 Adicionar logs `audit.screen_access.captured`, `audit.screen_access.publish_failed` e `audit.catalog.match_failed` sem snapshot no log.
- [ ] 8.3 Garantir tracing/correlacao com `traceparent`, `screenAccessId` e `requestId`.
- [ ] 8.4 Criar testes de integracao BFF + audit fake + API fake cobrindo Prata, Ouro e falha de auditoria.
- [ ] 8.5 Criar E2E Playwright: auditor consulta catalogo, filtra eventos, abre snapshot Ouro.
- [ ] 8.6 Criar E2E Playwright: usuario sem `snapshot:visualizar` nao consegue ver snapshot.
- [ ] 8.7 Executar suite relevante de BFF, frontend e dominios afetados.
- [ ] 8.8 Documentar runbook de falha `AUDIT_UNAVAILABLE`, criterios de Ouro, retencao 90 dias e como alterar catalogo via PR/deploy.
- [ ] 8.9 Registrar backlog para filtro nativo por `auditLevel` e job de retencao fisica no Oracle, se ainda nao existirem tickets.
- [ ] 8.10 Consolidar evidencias de cobertura RF-01 a RF-08.

## Sequenciamento

- Bloqueado por: 2.0, 4.0, 5.0, 6.0, 7.0
- Desbloqueia: Nenhuma
- Paralelizavel: Nao. Esta tarefa valida a entrega integrada e depende dos fluxos principais prontos.

## Rastreabilidade

- Cobre metricas de sucesso do PRD e valida RF-01 a RF-08 de ponta a ponta.
- Evidencia esperada: suites automatizadas e relatorio/evidencias com usuarios autorizado e nao autorizado.

## Detalhes de Implementacao

Alertas minimos devem incluir qualquer fail-closed em Ouro, aumento anormal de bytes de snapshot e ausencia de eventos Prata/Ouro em telas classificadas. O runbook deve explicar que fail-closed e comportamento esperado para evitar exposicao sem rastro auditavel.

## Criterios de Sucesso Verificaveis

- [ ] Metricas de captura, bytes, latencia e fail-closed estao disponiveis.
- [ ] Logs nao contem body de snapshot nem headers sensiveis.
- [ ] E2E autorizado consegue abrir snapshot Ouro.
- [ ] E2E sem permissao recebe bloqueio e nao tem snapshot no DOM.
- [ ] Testes BFF cobrem Prata, Ouro, Bronze, falha de auditoria e resposta nao JSON.
- [ ] Documentacao operacional e backlog de evolucoes futuras estao registrados.
- [ ] Evidencias mostram 100% das telas principais classificadas ou lacunas formalmente registradas.
