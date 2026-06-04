---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>plataforma/bff/auditoria</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>4.0, 5.0, 8.0</unblocks>
</task_context>

# Tarefa 3.0: Implementar produtor HTTP e builder de `SCREEN_ACCESS` no BFF

## Relacionada as User Stories

- Compliance consulta acessos Prata/Ouro com usuario, rota, horario, IP e contexto.
- Auditor entende filtros e entidades consultadas sem snapshot em Prata.
- Responsavel por incidente visualiza snapshot Ouro fiel ao payload entregue.

## Visao Geral

Criar no BFF um produtor HTTP pequeno para publicar eventos `SCREEN_ACCESS` no `ecad-auditoria` e um builder que monte o payload padronizado com metadados, correlacao, contexto de negocio e snapshot somente para Ouro.

## Requisitos

- Publicar em `POST {AUDIT_BASE_URL}/api/v1/audit/events` usando timeout curto.
- Gerar `eventId` idempotente por acesso capturado.
- Preencher `eventType=SCREEN_ACCESS`, `origin`, `correlation`, `screen.businessContext` e `metadata`.
- Registrar `auditLevel`, `catalogVersion` e `retentionDays=90`.
- Para Ouro, incluir snapshot com `statusCode`, headers permitidos, `body`, `capturedAtUtc` e `contentHash`.
- Remover tokens, cookies, authorization headers, senhas e headers internos.
- Nunca escrever snapshot em logs.

## Arquivos Envolvidos

- **Criar:**
  - `services/bff/src/auditoria/auditEventPublisher.ts`
  - `services/bff/src/auditoria/auditEventPublisher.test.ts`
  - `services/bff/src/auditoria/screenAccessEventBuilder.ts`
  - `services/bff/src/auditoria/screenAccessEventBuilder.test.ts`
  - `services/bff/src/auditoria/snapshotHash.ts`, se fizer sentido separar
- **Modificar:**
  - `services/bff/src/config.ts`
  - `services/bff/src/config.test.ts`
  - `services/bff/src/server.test.ts`, se houver fixtures globais de config
- **Referencia:**
  - `services/bff/src/auditoriaRoutes.ts`
  - `services/bff/src/correlationId.ts`
  - `tasks/plataforma/prd-auditoria-telas/techspec.md`

## Subtarefas

- [ ] 3.1 Revisar configuracao atual de `auditBaseUrl` e `auditTimeoutMs`.
- [ ] 3.2 Criar publisher HTTP com tratamento de 2xx, 4xx/5xx, timeout e abort.
- [ ] 3.3 Criar builder de evento com dados de usuario, IP, user agent, rota BFF, upstream, trace/request/session id e screen access id.
- [ ] 3.4 Implementar allowlist de headers do snapshot e bloqueio de headers sensiveis.
- [ ] 3.5 Calcular `contentHash` deterministico para snapshot JSON.
- [ ] 3.6 Garantir que `SILVER` nunca receba `snapshot`.
- [ ] 3.7 Garantir que `GOLD` receba snapshot fiel ao body JSON entregue.
- [ ] 3.8 Adicionar logs estruturados sem payload: sucesso, falha de publicacao e payload invalido.
- [ ] 3.9 Criar testes unitarios para shape do evento, redaction, hash, retencao e timeout.

## Sequenciamento

- Bloqueado por: 1.0
- Desbloqueia: 4.0, 5.0, 8.0
- Paralelizavel: Sim. Pode rodar em paralelo com 2.0 porque usa o catalogo, nao depende dos guards de consulta.

## Rastreabilidade

- Cobre RF-03, RF-04 e RF-06.
- Evidencia esperada: evento Prata sem snapshot e evento Ouro com snapshot idempotente e sem headers sensiveis.

## Detalhes de Implementacao

O publisher deve falhar de forma observavel para que a task 4.0 consiga aplicar fail-closed. Nao criar SDK pesado para o BFF nesta entrega. Preferir tipos explicitos e payload validado por funcoes pequenas.

O snapshot Ouro da V1 nao mascara campos do corpo, mas isso nao autoriza registrar tokens, cookies ou headers sensiveis. Logs devem conter apenas metadados como `eventId`, `screenId`, `level`, status e latencia.

## Criterios de Sucesso Verificaveis

- [ ] Teste comprova publicacao HTTP correta para `SCREEN_ACCESS`.
- [ ] Teste Prata comprova ausencia de `screen.businessContext.snapshot`.
- [ ] Teste Ouro comprova snapshot com body, `capturedAtUtc` e `contentHash`.
- [ ] Teste comprova remocao de `authorization`, `cookie` e headers internos.
- [ ] Falha/timeout do audit-service retorna erro controlado para o proxy aplicar fail-closed.
- [ ] Nenhum log de teste contem corpo de snapshot.
