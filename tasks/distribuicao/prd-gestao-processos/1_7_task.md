---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>distribuicao/application</domain>
<type>configuration</type>
<scope>cross_cutting</scope>
<complexity>medium</complexity>
<dependencies>rabbitmq,database</dependencies>
<unblocks>"4.0","6.0"</unblocks>
</task_context>

# Tarefa 1.7: Auditoria (AuditContextProvider + ProcessoAuditEventFactory + config)

## Relacionada às User Stories

- HU-02..HU-07 (toda escrita deve ser auditada conforme RF-AUD-01..04 do PRD)

## Contexto

A `distribuicao-api` já tem o `audit-sdk-spring-boot-starter` no `pom.xml` e a tabela `distribuicao.audit_outbox` provisionada por `V4__create_audit_outbox.sql`. **Falta apenas o wiring de aplicação**: o helper local `AuditContextProvider` (resolve `AuditContext` a partir do JWT/request) e uma `ProcessoAuditEventFactory` específica para a entidade `ProcessoDistribuicao`.

Padrão a seguir é o de `CriarUsuarioMusicaCommandHandler:30-78` em `arrecadacao-application` (1 `userAction` + 1 `dataChange` por comando, ambos chamados via `auditClient.publish()` na mesma transação).

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/audit/AuditContextProvider.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/audit/ProcessoAuditEventFactory.java`
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/audit/ProcessoAuditOperation.java` (enum)
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/audit/ProcessoAuditChange.java` (record)
  - `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/audit/ProcessoSnapshot.java` (record `before`/`after` — captura status, datas, justificativa, totalExecucoes)
- **Modificar:**
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` — adicionar bloco `audit` (mode=OUTBOX_RABBITMQ, relay-delay-ms, exchange, routing-key)
- **Referência (NÃO modificar — apenas portar pattern):**
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/audit/AuditContextProvider.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/audit/PagamentoAuditEventFactory.java`
  - `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/audit/UsuarioMusicaAuditEventFactory.java`

## Subtarefas

- [ ] 1.7.1 Portar `AuditContextProvider` de `arrecadacao-application/audit/AuditContextProvider.java`. Ajustar package e `serviceName="distribuicao-api"`. Resolve do JWT/HttpRequest: userId, username, displayName, roles, authProvider, ip, userAgent, traceId, requestId, userSessionId, screenAccessId, commandId, screenId, screenName, route, channel
- [ ] 1.7.2 Criar enum `ProcessoAuditOperation` com 5 valores (CREATE, CALCULATE, APPROVE, FINALIZE, CANCEL), cada um com `actionCode` (ex: `PROCESSO_DISTRIBUICAO_CREATE`) e `label` (ex: `"Criar processo"`)
- [ ] 1.7.3 Criar record `ProcessoSnapshot` que serializa o estado relevante de `ProcessoDistribuicao` (id, rubricaSigla, periodo, status, verbaLiquida, totalExecucoes, justificativaCancelamento, criadoEm, calculadoEm, aprovadoEm, finalizadoEm, canceladoEm). Método estático `from(ProcessoDistribuicao)`
- [ ] 1.7.4 Criar record `ProcessoAuditChange(ProcessoDistribuicao processo, ProcessoAuditOperation operation, ProcessoSnapshot before)`
- [ ] 1.7.5 Criar `ProcessoAuditEventFactory` com 2 métodos:
  - `userAction(ProcessoDistribuicao processo, AuditContext ctx, ProcessoAuditOperation op)` → `AuditEvent` com `eventType=USER_ACTION`, `source.entityType="ProcessoDistribuicao"`, `source.entityId=processo.getId()`, `source.systemName="mcad"`, `source.serviceName="distribuicao-api"`, `userAction.actionCode=op.code()`, `userAction.label=op.label()`
  - `dataChange(ProcessoAuditChange change, AuditContext ctx)` → `AuditEvent` com `eventType=DATA_CHANGE`, `data.entityType="ProcessoDistribuicao"`, `data.entityId=change.processo().getId()`, `data.before=change.before()` (pode ser null no CREATE), `data.after=ProcessoSnapshot.from(change.processo())`, `data.dataAction` derivado da operation (CREATE/UPDATE/DELETE)
- [ ] 1.7.6 Adicionar bloco `audit` ao `application.yml`:
  ```yaml
  audit:
    mode: ${AUDIT_MODE:OUTBOX_RABBITMQ}
    relay-delay-ms: ${AUDIT_RELAY_DELAY_MS:5000}
    rabbit:
      exchange: ${AUDIT_RABBIT_EXCHANGE:audit.events.exchange.v1}
      routing-key: ${AUDIT_RABBIT_ROUTING_KEY:audit.event.v1}
  ```
- [ ] 1.7.7 Verificar compilação: `cd services/distribuicao-api && mvn compile`

## Sequenciamento

- Bloqueado por: nenhum (cross-cutting independente)
- Desbloqueia: 4.0 (handlers injetam `AuditClient` + `AuditContextProvider` + `ProcessoAuditEventFactory`), 6.0 (`ProcessoAuditOutboxIntegrationTest`)
- Paralelizável: **Sim** — pode rodar em paralelo com 1.0, 1.5, 2.0, 3.0

## Detalhes de Implementação

### Enum ProcessoAuditOperation

```java
public enum ProcessoAuditOperation {
    CREATE("PROCESSO_DISTRIBUICAO_CREATE", "Criar processo", DataAction.CREATE),
    CALCULATE("PROCESSO_DISTRIBUICAO_CALCULATE", "Calcular processo", DataAction.UPDATE),
    APPROVE("PROCESSO_DISTRIBUICAO_APPROVE", "Aprovar processo", DataAction.UPDATE),
    FINALIZE("PROCESSO_DISTRIBUICAO_FINALIZE", "Finalizar processo", DataAction.UPDATE),
    CANCEL("PROCESSO_DISTRIBUICAO_CANCEL", "Cancelar processo", DataAction.UPDATE);

    private final String code;
    private final String label;
    private final DataAction dataAction;
    // constructor + getters
}
```

### ProcessoAuditEventFactory (esqueleto)

```java
@Component
public class ProcessoAuditEventFactory {

    public AuditEvent userAction(ProcessoDistribuicao processo,
                                 AuditContext ctx,
                                 ProcessoAuditOperation op) {
        return AuditEvent.builder()
            .eventType(EventType.USER_ACTION)
            .source(AuditSource.builder()
                .systemName("mcad")
                .serviceName("distribuicao-api")
                .entityType("ProcessoDistribuicao")
                .entityId(processo.getId().toString())
                .schema("distribuicao")
                .environment(ctx.environment())
                .build())
            .userAction(UserAction.builder()
                .actionCode(op.code())
                .label(op.label())
                .businessContext(Map.of(
                    "rubricaSigla", processo.getRubricaSigla(),
                    "periodo", processo.getPeriodo(),
                    "status", processo.getStatus().name()))
                .build())
            .context(ctx)
            .build();
    }

    public AuditEvent dataChange(ProcessoAuditChange change, AuditContext ctx) {
        return AuditEvent.builder()
            .eventType(EventType.DATA_CHANGE)
            .source(AuditSource.builder()
                .systemName("mcad")
                .serviceName("distribuicao-api")
                .entityType("ProcessoDistribuicao")
                .entityId(change.processo().getId().toString())
                .schema("distribuicao")
                .environment(ctx.environment())
                .build())
            .data(DataChange.builder()
                .entityType("ProcessoDistribuicao")
                .entityId(change.processo().getId().toString())
                .dataAction(change.operation().dataAction())
                .before(change.before())
                .after(ProcessoSnapshot.from(change.processo()))
                .build())
            .context(ctx)
            .build();
    }
}
```

> **Nota:** os tipos exatos (`AuditEvent`, `AuditSource`, `UserAction`, `DataChange`, `EventType`, `DataAction`) vêm do `audit-sdk`. Confirmar API real ao portar — usar `PagamentoAuditEventFactory.java` em arrecadacao como referência canônica de assinaturas.

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] `AuditContextProvider`, `ProcessoAuditEventFactory`, `ProcessoAuditOperation`, `ProcessoAuditChange`, `ProcessoSnapshot` existem em `distribuicao-application/.../audit/`
- [ ] `application.yml` contém bloco `audit` com `mode=OUTBOX_RABBITMQ`
- [ ] Todos os 5 valores de `ProcessoAuditOperation` mapeiam para `actionCode` no padrão `PROCESSO_DISTRIBUICAO_<OP>`
- [ ] `ProcessoSnapshot.from(processo)` produz snapshot completo (validado por unit test em 6.0)
- [ ] App sobe sem erro com o `audit-sdk` ativo (log mostra `RabbitAuditOutboxRelay started` ou equivalente)
