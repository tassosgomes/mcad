---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0", "7.0", "8.0"]
---

<task_context>
<domain>arrecadacao/tests</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database,external_apis</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 9.0: Testes de integracao (Testcontainers + AMQP simulado)

## Relacionada as User Stories

- [HU-01] Calculo automatico ao registrar pagamento (direta — fluxo end-to-end)
- [HU-02] Recalculo automatico ao estornar pagamento (direta)
- [HU-03] Acompanhar verbas — detalhada (direta — controller endpoints)
- [HU-04] Acompanhar verbas — agregada (direta)
- [HU-05] Visualizar status da verba (direta — consumer aplica lock end-to-end)

## Visao Geral

Suite de testes de integracao com PostgreSQL via Testcontainers e RabbitMQ (Testcontainers ou TestRabbit) validando todos os fluxos end-to-end. Devem ficar no modulo `arrecadacao-tests` seguindo o padrao de `LicencaPersistenceIT`, `PagamentoControllerIntegrationTest`, etc.

## Requisitos

- `VerbaPersistenceIT` (em parte ja coberto na task 2.0, complementar aqui):
  - Recalculo concorrente — duas threads tentam recalcular mesma `(rubrica, periodo)`; com lock, uma espera a outra
- `VerbaRecalculoFlowIT`:
  - Registrar 3 pagamentos via `RegistrarPagamentoCommandHandler` real
  - Verificar `arrecadacao.verbas`: 1 linha com bruto=soma, liquida=85%, qtdPagamentos=3
  - Verificar `arrecadacao.outbox_events`: 3 eventos `arrecadacao.verba.disponivel` + 3 `arrecadacao.pagamento.registrado`
- `VerbaLockIT`:
  - Marcar verba como `EM_DISTRIBUICAO` diretamente (via repository)
  - Tentar novo `RegistrarPagamentoCommand` → HTTP 422 com problema RFC 7807
  - Tentar `EstornarPagamentoCommand` → 422 (refatoracao task 4.0)
- `VerbaEstornoFlowIT`:
  - Registrar pagamento, estornar todos, verificar verba zerada mas registro ainda existe (RF-07)
  - Verificar evento emitido mesmo com zero (RF-10)
- `VerbaControllerIT`:
  - GET listagem paginada com filtros — happy path + 400 em periodo invalido
  - GET agregado retorna SUM correto por rubrica
  - GET busca pontual: 200 quando existe, 404 quando nao
  - 401 sem token, 403 sem role
- `DistribuicaoProcessoEventListenerIT`:
  - Publicar mensagem CloudEvents simulada na exchange `distribuicao.events` via `RabbitTemplate`
  - Aguardar consumo (Awaitility) — verba muda para `EM_DISTRIBUICAO`
  - Publicar `processo.finalizado` → `DISTRIBUIDA`
  - Publicar evento com `rubricaSigla` inexistente → log warn + sem alteracao

## Subtarefas

- [ ] 9.1 `VerbaPersistenceIT` — cenarios de lock concorrente (CompletableFuture + 2 threads)
- [ ] 9.2 `VerbaRecalculoFlowIT` — fluxo F04→F05 completo
- [ ] 9.3 `VerbaLockIT` — bloqueio em pagamento e em estorno
- [ ] 9.4 `VerbaEstornoFlowIT` — verba zerada apos estorno total
- [ ] 9.5 `VerbaControllerIT` — endpoints com fixtures
- [ ] 9.6 `DistribuicaoProcessoEventListenerIT` — publish + consume com Awaitility
- [ ] 9.7 Atualizar `pom.xml` se Awaitility ainda nao estiver no `arrecadacao-tests` (provavel ja estar)
- [ ] 9.8 `qa_report.md` inicial com matriz de cenarios x status

## Sequenciamento

- Bloqueado por: 5.0, 6.0, 7.0, 8.0 (todo o backend precisa estar pronto)
- Desbloqueia: nada (pode rodar em paralelo com 10.0 — frontend)
- Paralelizavel: Nao (depende de tudo do backend)

## Rastreabilidade

- Esta tarefa cobre: HU-01, HU-02, HU-03, HU-04, HU-05 (todas — testes end-to-end)
- Evidencia esperada: `mvn -pl arrecadacao-tests test` verde com novos casos; `qa_report.md` preenchido na branch

## Detalhes de Implementacao

Reutilizar `BaseIntegrationTest` ja existente em `arrecadacao-tests` (que sobe PostgreSQL Testcontainers). Para RabbitMQ, usar a config Testcontainers ja presente (ver `LicencaControllerIntegrationTest` para fixture base).

Awaitility para consumer:

```java
@Test
void deveAplicarLockAoReceberProcessoIniciado() {
    // Arrange: verba ABERTA persistida
    UUID rubricaId = seedRubrica("RADIO");
    seedVerba(rubricaId, "2026-04", StatusVerba.ABERTA);

    // Act: publicar CloudEvent na exchange distribuicao.events
    rabbitTemplate.send("distribuicao.events", "distribuicao.processo.iniciado",
        buildCloudEvent("processo.iniciado", "RADIO", "2026-04"));

    // Assert: aguardar consumo
    await().atMost(5, SECONDS).untilAsserted(() -> {
        Verba v = verbaRepository.findByRubricaIdAndPeriodo(rubricaId, "2026-04").orElseThrow();
        assertThat(v.getStatus()).isEqualTo(StatusVerba.EM_DISTRIBUICAO);
    });
}
```

## Criterios de Sucesso

- `mvn -pl arrecadacao-tests test` 100% verde
- Cobertura nova de pelo menos 12 cenarios novos
- `qa_report.md` com matriz mostrando cobertura por HU
- Nenhum teste flaky (3 execucoes consecutivas verdes)
- Tempo total dos novos ITs < 60s (Testcontainers reusa contexto)
