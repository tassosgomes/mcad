# QA Report — F05: Cálculo e Disponibilização de Verba Líquida

> **Task:** 9.0 — Testes de integração (Testcontainers + AMQP simulado)
> **Data:** 2026-05-11
> **Módulo:** `services/arrecadacao-api/arrecadacao-tests`
> **Branch:** (implementação pendente de criação de branch pelo workflow)

---

## Baseline de Compilação

```
mvn -pl arrecadacao-tests test-compile
```

**Status:** BUILD SUCCESS — 17 arquivos compilados sem erros.

---

## Matriz de Cenários por HU

| HU | Cenário | Classe de Teste | Status |
|----|---------|----------------|--------|
| HU-01 | Registrar 3 pagamentos → verba acumula corretamente (bruto, deduções, líquida) | `VerbaRecalculoFlowIT#registrar3Pagamentos_DeveCalcularVerbaCorretamente` | Compilado — execução pendente (sem Docker/PostgreSQL) |
| HU-01 | 3 pagamentos → 3 eventos `arrecadacao.pagamento.registrado` no outbox | `VerbaRecalculoFlowIT#registrar3Pagamentos_DeveCalcularVerbaCorretamente` | Compilado — execução pendente |
| HU-01 | 3 pagamentos → 3 eventos `arrecadacao.verba.disponivel` no outbox | `VerbaRecalculoFlowIT#registrar3Pagamentos_DeveCalcularVerbaCorretamente` | Compilado — execução pendente |
| HU-02 | Estorno do único pagamento → verba zerada mas registro persiste (RF-07) | `VerbaEstornoFlowIT#estornarUnicoPagamento_DeveZerarVerbaMasManterRegistro` | Compilado — execução pendente |
| HU-02 | Estorno → evento `arrecadacao.verba.disponivel` com valores zerados publicado (RF-10) | `VerbaEstornoFlowIT#estornarUnicoPagamento_DeveZerarVerbaMasManterRegistro` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas` sem filtros → retorna todas as verbas | `VerbaControllerIT#listar_SemFiltros_DeveRetornarTodasAsVerbas` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas?rubricaSigla=X` → filtro por rubrica | `VerbaControllerIT#listar_FiltradoPorRubricaSigla_DeveRetornarApenasVerbasDaRubrica` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas?status=EM_DISTRIBUICAO` → filtro por status | `VerbaControllerIT#listar_FiltradoPorStatusEmDistribuicao_DeveRetornarApenasVerbasBloqueadas` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas?periodo=2026-13` → 400 RFC 7807 | `VerbaControllerIT#listar_PeriodoInvalido_DeveRetornar400` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas?periodoInicio=INVALIDO` → 400 | `VerbaControllerIT#listar_PeriodoInicioInvalido_DeveRetornar400` | Compilado — execução pendente |
| HU-04 | `GET /api/v1/verbas/agregado-por-rubrica` → SUM correto por rubrica | `VerbaControllerIT#listarAgregado_DeveRetornarSumCorreto` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas/{sigla}/{periodo}` — 200 com payload completo | `VerbaControllerIT#buscar_VerbaExistente_DeveRetornar200ComPayloadCompleto` | Compilado — execução pendente |
| HU-03 | `GET /api/v1/verbas/{sigla}/2099-01` → 404 RFC 7807 | `VerbaControllerIT#buscar_VerbaInexistente_DeveRetornar404` | Compilado — execução pendente |
| HU-03 | Consultor acessa endpoints → 200 (read-only) | `VerbaControllerIT#listar_ConsultorArrecadacao_DeveRetornar200` | Compilado — execução pendente |
| HU-03 | Usuário sem role → 403 | `VerbaControllerIT#listar_SemRole_DeveRetornar403` | Compilado — execução pendente |
| HU-05 | Verba EM_DISTRIBUICAO → novo pagamento bloqueado (VerbaEmDistribuicaoException) | `VerbaLockIT#registrarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao` | Compilado — execução pendente |
| HU-05 | Verba EM_DISTRIBUICAO → pagamento não gravado na tabela | `VerbaLockIT#registrarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao` | Compilado — execução pendente |
| HU-05 | Verba EM_DISTRIBUICAO → estorno bloqueado (VerbaEmDistribuicaoException) | `VerbaLockIT#estornarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao` | Compilado — execução pendente |
| HU-05 | Verba EM_DISTRIBUICAO → pagamento permanece CONFIRMADO após tentativa de estorno | `VerbaLockIT#estornarPagamento_ComVerbaEmDistribuicao_DeveLancarExcecao` | Compilado — execução pendente |
| HU-05 | processo.iniciado → verba muda para EM_DISTRIBUICAO | `DistribuicaoProcessoEventListenerIT#onMessage_ProcessoIniciado_DeveAplicarLockNaVerba` | Compilado — execução pendente |
| HU-05 | processo.finalizado → verba muda para DISTRIBUIDA | `DistribuicaoProcessoEventListenerIT#onMessage_ProcessoFinalizado_DeveMarcarDistribuida` | Compilado — execução pendente |
| HU-05 | rubricaSigla inexistente → log warn + sem alteração | `DistribuicaoProcessoEventListenerIT#onMessage_RubricaDesconhecida_DeveIgnorarSemAlterarVerba` | Compilado — execução pendente |
| HU-05 | tipo de evento desconhecido → ignorado sem alteração | `DistribuicaoProcessoEventListenerIT#onMessage_TipoDesconhecido_DeveIgnorar` | Compilado — execução pendente |
| HU-05 | verba inexistente para rubrica+periodo → log warn + no-op | `DistribuicaoProcessoEventListenerIT#onMessage_ProcessoIniciado_VerbaInexistente_DeveLogWarnENaoFalhar` | Compilado — execução pendente |
| HU-01/02 | Lock pessimista serializa duas threads concorrentes (sem lost update) | `VerbaPersistenceIT#findByRubricaIdAndPeriodoForUpdate_ConcurrentThreads_ShouldSerialize` | Compilado — execução pendente |

---

## Arquivos de Teste Criados (Task 9.0)

| Arquivo | Localização | Tipo | Cenários |
|---------|-------------|------|----------|
| `VerbaRecalculoFlowIT.java` | `integration/` | Flow IT | 1 (3 sub-asserts: verba + outbox verba + outbox pagamento) |
| `VerbaLockIT.java` | `integration/` | Lock IT | 2 (bloquear registro + bloquear estorno) |
| `VerbaEstornoFlowIT.java` | `integration/` | Flow IT | 1 (3 sub-asserts: valores zerados + registro mantido + evento RF-10) |
| `VerbaControllerIT.java` | `integration/` | Controller IT | 8 cenários via MockMvc |
| `DistribuicaoProcessoEventListenerIT.java` | `integration/` | Consumer IT | 5 cenários |

**Total:** 17 novos cenários de integração (excluindo `VerbaPersistenceIT` já existente da task 2.0).

---

## Resultado dos Testes Unitários (sem Docker)

```
mvn test -pl arrecadacao-domain,arrecadacao-application,arrecadacao-infra
```

**Status:** BUILD SUCCESS — 73 testes, 0 falhas, 0 erros.

| Módulo | Testes | Status |
|--------|--------|--------|
| `arrecadacao-domain` | 0 (não roda sem contexto Spring) | N/A |
| `arrecadacao-application` | 59 | VERDE |
| `arrecadacao-infra` | 14 | VERDE |

---

## Status por IT (execução)

| Classe | Status | Motivo |
|--------|--------|--------|
| `VerbaPersistenceIT` | Bloqueado por Docker/PostgreSQL | Conecta em localhost:5432 via `application-test.yml` |
| `VerbaRecalculoFlowIT` | Bloqueado por Docker/PostgreSQL | Idem |
| `VerbaLockIT` | Bloqueado por Docker/PostgreSQL | Idem |
| `VerbaEstornoFlowIT` | Bloqueado por Docker/PostgreSQL | Idem |
| `VerbaControllerIT` | Bloqueado por Docker/PostgreSQL | Idem |
| `DistribuicaoProcessoEventListenerIT` | Bloqueado por Docker/PostgreSQL | Listener chama repositório JPA que requer banco |

**Nota:** A infra RabbitMQ **não é necessária** para `DistribuicaoProcessoEventListenerIT` — o listener é chamado diretamente com `Message` construída, sem passar pelo broker. O bloqueio é apenas por PostgreSQL.

---

## Arquitetura dos Testes de Integração

### Estratégia de `VerbaService`

- **Testes de controller e persistence (existentes):** Importam `VerbaServiceTestConfig` (stub configurável). Não exercitam o cálculo real.
- **Testes de fluxo (novos):** NÃO importam `VerbaServiceTestConfig`. O Spring usa `VerbaServiceImpl` (bean real), exercitando o cálculo end-to-end completo.
- **`DistribuicaoProcessoEventListenerIT`:** Importa `VerbaServiceTestConfig` pois não exercita o cálculo — apenas testa as transições de status via listener.

### Gerenciamento de Transações

Testes de fluxo (`VerbaRecalculoFlowIT`, `VerbaLockIT`, `VerbaEstornoFlowIT`) usam `TransactionTemplate` manual sem `@Transactional` no nível de classe, permitindo commits reais entre operações (necessário para testar o estado persistido). Cada assert usa `status.setRollbackOnly()` para limpeza.

### Mock de RabbitMQ

Todos os ITs usam `@MockBean RabbitTemplate` para isolar a publicação de mensagens ao RabbitMQ broker (que pode não estar disponível). O `OutboxPublisherWorker` tem `poll-interval-ms: 99999999` no `application-test.yml`, portanto não tenta publicar durante os testes.

---

## Bloqueios Ambientais

**Docker não disponível no WSL 2 desta sessão.** Para rodar os ITs:

```bash
# 1. Iniciar infraestrutura
docker compose -f docker-compose.dev.yml up -d

# 2. Aguardar PostgreSQL e RabbitMQ subirem
# 3. Executar os ITs de verba
cd services/arrecadacao-api
mvn -pl arrecadacao-tests test -Dtest="Verba*IT,DistribuicaoProcessoEventListenerIT"

# 4. Verificar resultado esperado
# BUILD SUCCESS, 17+ novos cenários verdes
```

---

## Decisões Técnicas

1. **Sem Testcontainers RabbitMQ:** O listener `DistribuicaoProcessoEventListener` é testado chamando diretamente `listener.onMessage(message)` com uma `Message` AMQP construída programaticamente (mesmo padrão do teste unitário `DistribuicaoProcessoEventListenerTest`). Isso elimina a dependência de um broker RabbitMQ nos ITs do listener.

2. **`VerbaServiceImpl` real nos testes de fluxo:** A exclusão do `VerbaServiceTestConfig` nos ITs de fluxo (`VerbaRecalculoFlowIT`, `VerbaLockIT`, `VerbaEstornoFlowIT`) garante que o cálculo real é exercitado end-to-end.

3. **`TransactionTemplate` para commits reais:** Necessário para testar o estado persistido entre operações (ex: registrar pagamento em tx1, verificar verba em tx2).

4. **Awaitility adicionado ao `arrecadacao-tests/pom.xml`:** Versão gerenciada pela BOM do Spring Boot 3.3.5 (4.2.2). Disponível para uso futuro quando houver Testcontainers RabbitMQ.

5. **CNPJs de teste únicos:** Cada cenário usa CNPJs pré-calculados únicos para evitar conflitos de constraint unique no banco de dados compartilhado.
