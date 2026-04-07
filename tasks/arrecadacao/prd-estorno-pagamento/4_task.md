---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>arrecadacao/api</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database, http_server</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: API — endpoint POST /estornar + GlobalExceptionHandler + testes integracao

## Relacionada as User Stories

- [HU-01] Estornar pagamento (cobertura direta — endpoint HTTP)
- [HU-02] Consultar pagamento estornado (cobertura direta — response com dados de estorno)

## Visao Geral

Adicionar endpoint `POST /api/v1/pagamentos/{id}/estornar` ao PagamentoController existente, com @PreAuthorize para analista e logging SLF4J. Estender GlobalExceptionHandler com handler para VerbaEmDistribuicaoException (422). Criar testes de integracao cobrindo happy path e todos os cenarios de erro (400, 403, 404, 422).

## Requisitos

1. Endpoint POST /pagamentos/{id}/estornar com @Valid e @PreAuthorize
2. Logging SLF4J no endpoint de estorno
3. GlobalExceptionHandler: VerbaEmDistribuicaoException → 422 com ProblemDetail
4. Testes de integracao: 200, 400, 403, 404, 422 (ja estornado), 422 (verba lock)
5. Teste de persistencia: campos de estorno salvos, partial unique liberado

## Arquivos Envolvidos

- **Modificar:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/PagamentoController.java` (adicionar endpoint estornar)
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` (adicionar handler VerbaEmDistribuicaoException)
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/PagamentoEndpointsIntegrationTest.java` (adicionar cenarios estorno)
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/PagamentoPersistenceIntegrationTest.java` (adicionar cenario persistencia estorno)
- **Referencia:**
  - `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/LicencaController.java` (padrao controller)
  - `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/api/LicencaEndpointsIntegrationTest.java` (padrao testes integracao)

## Subtarefas

- [ ] 4.1 Adicionar endpoint `POST /{id}/estornar` ao PagamentoController
- [ ] 4.2 Adicionar handler VerbaEmDistribuicaoException ao GlobalExceptionHandler
- [ ] 4.3 Adicionar cenarios de estorno ao PagamentoEndpointsIntegrationTest (6 cenarios)
- [ ] 4.4 Adicionar cenario persistencia estorno ao PagamentoPersistenceIntegrationTest
- [ ] 4.5 Verificar que Flyway conta 9 migrations (V1-V9)

## Detalhes de Implementacao

**PagamentoController — novo endpoint:**

```java
@PostMapping("/{id}/estornar")
@PreAuthorize("hasRole('analista-arrecadacao')")
public ResponseEntity<PagamentoResponse> estornar(
        @PathVariable UUID id,
        @Valid @RequestBody EstornarPagamentoRequest request,
        Authentication auth) {
    LOGGER.info("Reversing payment: id={}, user={}", id, auth.getName());
    var cmd = new EstornarPagamentoCommand(id, request.justificativa(), auth.getName());
    return ResponseEntity.ok(dispatcher.dispatch(cmd));
}
```

**GlobalExceptionHandler — novo handler:**

```java
@ExceptionHandler(VerbaEmDistribuicaoException.class)
public ResponseEntity<ProblemDetail> handleVerbaEmDistribuicao(
        VerbaEmDistribuicaoException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
        HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    problem.setTitle("Verba In Distribution");
    return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
}
```

**Nota sobre VerbaService nos testes de integracao:** Como F05 pode nao estar implementado, usar um mock bean (`@MockBean VerbaService`) que por padrao nao lanca excecao (permite estorno). Para o cenario de verba lock, configurar mock para lancar VerbaEmDistribuicaoException.

## Testes

**PagamentoEndpointsIntegrationTest (novos cenarios):**
- [ ] `deveEstornarPagamentoConfirmadoERetornar200` — verifica campos de estorno na response
- [ ] `deveRetornar400ParaJustificativaCurta` — < 10 chars
- [ ] `deveRetornar404ParaPagamentoInexistente` — UUID aleatorio
- [ ] `deveRetornar422ParaPagamentoJaEstornado` — estornar duas vezes
- [ ] `deveRetornar422ParaVerbaEmDistribuicao` — mock VerbaService throws
- [ ] `deveRetornar403ParaConsultorAoEstornar` — @WithMockUser consultor

**PagamentoPersistenceIntegrationTest (novos cenarios):**
- [ ] `devePersistirCamposDeEstorno` — justificativaEstorno, estornadoPor, estornadoEm salvos
- [ ] `devePermitirNovoPagamentoAposEstorno` — partial unique libera slot

## Criterios de Sucesso

- [ ] Testes passam: `cd services/arrecadacao-api && mvn test -pl arrecadacao-tests`
- [ ] Flyway conta 9 migrations (V1-V9)
- [ ] POST /pagamentos/{id}/estornar retorna 200 com campos de estorno
- [ ] Consultor recebe 403
- [ ] Pagamento ja estornado retorna 422
- [ ] Testes existentes continuam passando
