---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>distribuicao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,rabbitmq</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 6.0: Testes backend — unitários e integração

## Relacionada às User Stories

- Todas (verificação)

## Visão Geral

Implementar testes unitários (entity state machine, command handlers, query handlers, event handlers) e testes de integração (controller HTTP, event listeners, outbox publisher) com Testcontainers.

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/ProcessoDistribuicaoTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/CriarProcessoCommandHandlerTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/TransicoesCommandHandlerTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/SnapshotHandlersTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/ListarDisponiveisQueryHandlerTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/ProcessoAuditEventFactoryTest.java` **(novo)**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/ProcessoControllerIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/SnapshotEventListenerIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/OutboxPublisherIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/authz/AuthzPermissionEnforcementTest.java` **(novo — espelha o de arrecadacao)**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/audit/ProcessoAuditOutboxIntegrationTest.java` **(novo)**
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/config/TestSecurityConfig.java` **(novo — desabilita validação real de JWT, mantém o aspect do starter; provê mock de `AuthzDecisionClient`)**

## Subtarefas

- [ ] 6.1 ProcessoDistribuicaoTest: todas transições válidas (5), todas inválidas (ex: CRIADO→APROVADO), cancelar de cada estado, cancelar FINALIZADO rejeita
- [ ] 6.2 CriarProcessoCommandHandlerTest: happy path, Rol ausente (422), Verba ausente (422), duplicata (409). **Mockar `AuditClient` e verificar 2 `publish()` por chamada bem-sucedida (1 userAction + 1 dataChange com `before=null`)**
- [ ] 6.3 TransicoesCommandHandlerTest: aprovar de CALCULADO (ok), aprovar de CRIADO (erro); finalizar de APROVADO (ok + 2 outbox); cancelar com justificativa válida/inválida. **Mockar `AuditClient` e verificar `before/after` corretos no `dataChange`**
- [ ] 6.4 SnapshotHandlersTest: RolEventHandler (criar, cancelar, idempotência), VerbaEventHandler (criar, atualizar). **Verificar que `AuditClient` NÃO é chamado** (consumers de evento ≠ auditoria)
- [ ] 6.5 ListarDisponiveisQueryHandlerTest: combinações com Rol+Verba+sem processo; com processo ativo filtra; cancelados não filtram
- [ ] 6.6 ProcessoAuditEventFactoryTest: para cada `ProcessoAuditOperation`, validar que `userAction()` produz `actionCode` esperado (`PROCESSO_DISTRIBUICAO_<OP>`) e que `dataChange()` produz `data.before/after` com snapshot correto da entidade
- [ ] 6.7 ProcessoControllerIntegrationTest: fluxo completo criar→calcular→aprovar→finalizar; criar com 409; transição inválida 422; cancelar com justificativa; filtros e paginação. **Após cada cenário, query em `distribuicao.audit_outbox` confirma os registros esperados**
- [ ] 6.8 SnapshotEventListenerIntegrationTest: CloudEvent válido → snapshot; payload inválido → descartado
- [ ] 6.9 OutboxPublisherIntegrationTest: evento na tabela → publicado no RabbitMQ
- [ ] 6.10 **AuthzPermissionEnforcementTest** (espelha `arrecadacao-tests/.../authz/AuthzPermissionEnforcementTest.java`): para CADA endpoint do `ProcessoController` (e dos endpoints atualizados do `RubricaController`):
  - `401` quando sem JWT
  - `403` quando `AuthzDecisionClient.checkDecision(<key>, ...)` mockado retorna `false`
  - `200/201` quando mock retorna `true`
- [ ] 6.11 **ProcessoAuditOutboxIntegrationTest** (Testcontainers PostgreSQL): para cada operation (CREATE, CALCULATE, APPROVE, FINALIZE, CANCEL), invocar o handler e verificar que `distribuicao.audit_outbox` contém:
  - 1 linha com `event_type=USER_ACTION`, payload com `userAction.actionCode=PROCESSO_DISTRIBUICAO_<OP>`
  - 1 linha com `event_type=DATA_CHANGE`, payload com `data.before` (null para CREATE) e `data.after` (estado final)
  - Ambas com `aggregate_type=ProcessoDistribuicao`, `aggregate_id` correto, e `status=PENDING`
- [ ] 6.12 **TestSecurityConfig**: configurar Spring Security para aceitar `jwt()` mockado e expor `@MockBean AuthzDecisionClient` para os testes 6.10

## Sequenciamento

- Bloqueado por: 5.0 (controller + endpoints), 1.5 (permissions.yaml para mockar), 1.7 (factory de auditoria)
- Desbloqueia: nenhum
- Paralelizável: Não

## Detalhes de Implementação

**ProcessoDistribuicaoTest** — testes de estado puro (sem mocks):
```java
@Test
void deveCriarProcessoComStatusCriado() {
    var processo = ProcessoDistribuicao.criar("RADIO", "2026-03", BigDecimal.valueOf(85000), "João", rolId, verbaId);
    assertThat(processo.getStatus()).isEqualTo(StatusProcesso.CRIADO);
}

@Test
void deveRejeitarTransicaoCriadoParaAprovado() {
    var processo = criarProcesso();
    assertThatThrownBy(processo::aprovar).isInstanceOf(TransicaoInvalidaException.class);
}

@Test
void deveRejeitarCancelamentoDeProcessoFinalizado() {
    var processo = criarProcessoFinalizado();
    assertThatThrownBy(() -> processo.cancelar("motivo")).isInstanceOf(TransicaoInvalidaException.class);
}
```

**ProcessoControllerIntegrationTest** — fluxo completo:
```java
@Test
void deveExecutarFluxoCompleto() {
    // Arrange: seed snapshots
    // Act: criar → calcular → aprovar → finalizar
    // Assert: cada step retorna 200 com status correto
    // Assert: GET /processos/{id} retorna FINALIZADO
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] Testes unitários passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="*unit*"`
- [ ] Testes integração passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="*integration*"`
- [ ] Testes de authz passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="AuthzPermissionEnforcementTest"`
- [ ] Testes de auditoria passam: `cd services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest="ProcessoAuditOutboxIntegrationTest"`
- [ ] Todos passam: `cd services/distribuicao-api && mvn test`
- [ ] Mínimo 18 testes unitários (entity + handlers + ProcessoAuditEventFactoryTest)
- [ ] Mínimo 10 testes de integração (controller + listeners + outbox + authz + audit)
- [ ] **`AuthzPermissionEnforcementTest` cobre os 9 endpoints do `ProcessoController` + 2 do `RubricaController` (legacy migrado)** em 3 cenários cada (401/403/200) → 33 assertions mínimas
- [ ] **`ProcessoAuditOutboxIntegrationTest` cobre as 5 `ProcessoAuditOperation`** → 10 assertions mínimas (5 × {userAction + dataChange})
