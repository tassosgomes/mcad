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
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/ProcessoControllerIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/SnapshotEventListenerIntegrationTest.java`
  - `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/OutboxPublisherIntegrationTest.java`

## Subtarefas

- [ ] 6.1 ProcessoDistribuicaoTest: todas transições válidas (5), todas inválidas (ex: CRIADO→APROVADO), cancelar de cada estado, cancelar FINALIZADO rejeita
- [ ] 6.2 CriarProcessoCommandHandlerTest: happy path, Rol ausente (422), Verba ausente (422), duplicata (409)
- [ ] 6.3 TransicoesCommandHandlerTest: aprovar de CALCULADO (ok), aprovar de CRIADO (erro); finalizar de APROVADO (ok + 2 outbox); cancelar com justificativa válida/inválida
- [ ] 6.4 SnapshotHandlersTest: RolEventHandler (criar, cancelar, idempotência), VerbaEventHandler (criar, atualizar)
- [ ] 6.5 ListarDisponiveisQueryHandlerTest: combinações com Rol+Verba+sem processo; com processo ativo filtra; cancelados não filtram
- [ ] 6.6 ProcessoControllerIntegrationTest: fluxo completo criar→calcular→aprovar→finalizar; criar com 409; transição inválida 422; cancelar com justificativa; filtros e paginação
- [ ] 6.7 SnapshotEventListenerIntegrationTest: CloudEvent válido → snapshot; payload inválido → descartado
- [ ] 6.8 OutboxPublisherIntegrationTest: evento na tabela → publicado no RabbitMQ

## Sequenciamento

- Bloqueado por: 5.0
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
- [ ] Todos passam: `cd services/distribuicao-api && mvn test`
- [ ] Mínimo 15 testes unitários
- [ ] Mínimo 8 testes de integração
