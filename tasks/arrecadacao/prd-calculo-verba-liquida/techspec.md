# Tech Spec — F05: Cálculo e Disponibilização de Verba Líquida

> **PRD:** `tasks/arrecadacao/prd-calculo-verba-liquida/prd.md`
> **Domínio:** Arrecadação (D03)
> **Data:** 2026-05-11

---

## Resumo Executivo

Quinta feature do serviço `arrecadacao-api`. Materializa a `Verba` como agregado por `(rubricaId, periodo)` com cálculo automático (85% líquido sobre o bruto), recalculado **incrementalmente** a cada pagamento confirmado (F04) ou estorno (F06). Publica evento `arrecadacao.verba.disponivel` via Outbox Pattern para a Distribuição (D04) e mantém um ciclo de status (`ABERTA → EM_DISTRIBUICAO → DISTRIBUIDA`) que serve como lock contra alterações enquanto a verba está sendo distribuída.

Reaproveita toda a infraestrutura já estabelecida: módulos Maven, CQRS sem MediatR (`CommandHandler`/`QueryHandler` + `Dispatcher`), `OutboxEventWriter`, `RabbitMqPublisher` e `OutboxPublisherWorker` (Outbox Pattern), padrão de `@RabbitListener` espelhando `IdentityUserEventListener` para os consumers de Distribuição, JPA Specification para queries paginadas, e `GlobalExceptionHandler` para mapeamento RFC 7807. Substitui a implementação `VerbaServiceNoOp` por uma real e refatora a interface `VerbaService` para unificar o lock entre F04 e F06.

No frontend, adiciona um novo módulo `features/arrecadacao/verbas` com duas visões (detalhada por rubrica×período e agregada por rubrica com drill-down), seguindo o padrão `pages/components/hooks/api/types` já consolidado nas features anteriores.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | CQRS Dispatcher, multi-módulo, domain methods com guards |
| `java-dependency-config` | Spring Data JPA, Flyway, JPA Specification |
| `java-code-quality` | Records para DTOs, naming, BigDecimal `setScale(2, HALF_UP)` |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers PostgreSQL |
| `java-observability` | Logging SLF4J estruturado, MDC `rubrica`/`periodo` |
| `common-restful-api` | Paginação `page/size`, sort `-` prefix, RFC 7807 |
| `react-architecture` | Feature module flat, hooks por endpoint, pages/components split |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
API Layer (arrecadacao-api)
  ├─ VerbaController
  │   ├─ GET  /api/v1/verbas                          → ListarVerbasQuery
  │   ├─ GET  /api/v1/verbas/agregado-por-rubrica     → ListarVerbasAgregadasQuery
  │   └─ GET  /api/v1/verbas/{rubricaSigla}/{periodo} → BuscarVerbaQuery
  └─ RabbitMqConfig (extensão)
       └─ Bindings: distribuicao.events → arrecadacao.distribuicao.processos

Application Layer (arrecadacao-application)
  ├─ Queries: ListarVerbasQuery, ListarVerbasAgregadasQuery, BuscarVerbaQuery
  ├─ DTOs: VerbaResponse, VerbaAgregadoResponse
  └─ Specification: VerbaSpecification (filtros rubrica, periodo range, status)

Domain Layer (arrecadacao-domain)
  ├─ Entities: Verba (novo agregado)
  ├─ Enums: StatusVerba (ABERTA, EM_DISTRIBUICAO, DISTRIBUIDA)
  ├─ Interfaces: VerbaRepository, VerbaService (refatorada)
  └─ Exceptions: VerbaEmDistribuicaoException (já existe — reaproveita)

Infra Layer (arrecadacao-infra)
  ├─ Services: VerbaServiceImpl (substitui VerbaServiceNoOp)
  ├─ Persistence: JpaVerbaRepository + SpringDataVerbaRepository
  └─ Events: DistribuicaoProcessoEventListener (consumer)

Integration Points
  ├─ Outbox: addEvent("arrecadacao.verba.disponivel", subject, payload)
  ├─ RegistrarPagamentoCommandHandler: chamadas a VerbaService antes/depois
  └─ EstornarPagamentoCommandHandler: assinatura atualizada
```

### Fluxo Principal — Registro de Pagamento

```
1. RegistrarPagamentoCommand
2. Buscar licença, validar status, buscar UDA vigente
3. verbaService.validarLockParaAlteracao(rubricaId, periodo)  ← NOVO
4. Pagamento.registrar(...)
5. pagamentoRepository.save(...)
6. verbaService.recalcularVerba(rubricaId, periodo)            ← NOVO
   ├─ verbaRepository.findByRubricaIdAndPeriodo(...) (FOR UPDATE)
   ├─ pagamentoRepository.sumAndCountConfirmados(rubricaId, periodo)
   ├─ Verba.recalcular(novoBruto, qtdPagamentos)
   ├─ verbaRepository.save(verba)
   └─ outboxEventWriter.addEvent("arrecadacao.verba.disponivel", subject, payload)
7. outboxEventWriter.addEvent("arrecadacao.pagamento.registrado", ...)
8. Auditoria
```

Tudo dentro da mesma transação Spring (`@Transactional`). O `OutboxPublisherWorker` (já em execução) publica os eventos no RabbitMQ após commit.

---

## Design de Implementação

### Interfaces Principais

**`VerbaService` refatorada** — quebra a separação artificial entre lock de estorno e lock de pagamento, alinhada com a regra única RF-16:

```java
public interface VerbaService {
    /**
     * Bloqueia alteração quando verba está EM_DISTRIBUICAO ou DISTRIBUIDA.
     * Chamado por RegistrarPagamento (F04) e EstornarPagamento (F06).
     * Lança VerbaEmDistribuicaoException (HTTP 422).
     */
    void validarLockParaAlteracao(UUID rubricaId, String periodo);

    /**
     * Recalcula valor bruto, deduções e líquida; publica
     * arrecadacao.verba.disponivel via Outbox. Idempotente em retry.
     */
    void recalcularVerba(UUID rubricaId, String periodo);
}
```

**`VerbaRepository`** — operações mínimas; lock pessimista para serializar recálculos concorrentes na mesma chave:

```java
public interface VerbaRepository {
    Verba save(Verba verba);
    Optional<Verba> findByRubricaIdAndPeriodoForUpdate(UUID rubricaId, String periodo);
    Optional<Verba> findByRubricaIdAndPeriodo(UUID rubricaId, String periodo);
    Page<Verba> findAll(Specification<Verba> spec, Pageable pageable);
    List<VerbaAgregadoProjection> findAgregadoPorRubrica(VerbaAgregadoFiltro filtro);
}
```

**`PagamentoRepository`** — novo método agregado para evitar carregar a coleção inteira:

```java
SumCountResult sumAndCountConfirmados(UUID rubricaId, String periodo);
```

Retorna um record `(BigDecimal totalBruto, long quantidade)`. Implementação via JPQL: `SELECT SUM(p.valorBruto), COUNT(p.id) FROM Pagamento p JOIN p.licenca l WHERE l.rubricaId = :r AND p.periodo = :p AND p.status = 'CONFIRMADO'`.

### Modelos de Dados

**Migration `V13__create_verbas.sql`** (DECIMAL(15,2) alinhado com `snapshots_verba` do D04):

```sql
CREATE TABLE arrecadacao.verbas (
    id                      UUID           PRIMARY KEY,
    rubrica_id              UUID           NOT NULL REFERENCES arrecadacao.rubricas(id),
    periodo                 VARCHAR(7)     NOT NULL,
    valor_bruto_total       DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_ecad            DECIMAL(15,2)  NOT NULL DEFAULT 0,
    deducao_associacoes     DECIMAL(15,2)  NOT NULL DEFAULT 0,
    verba_liquida           DECIMAL(15,2)  NOT NULL DEFAULT 0,
    quantidade_pagamentos   INTEGER        NOT NULL DEFAULT 0,
    status                  VARCHAR(20)    NOT NULL DEFAULT 'ABERTA',
    criado_em               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_verbas_rubrica_periodo UNIQUE (rubrica_id, periodo)
);
CREATE INDEX ix_verbas_periodo ON arrecadacao.verbas (periodo);
CREATE INDEX ix_verbas_status  ON arrecadacao.verbas (status);
```

**Entidade `Verba`** — agregado com guards de domínio:

```java
@Entity
@Table(name = "verbas", schema = "arrecadacao")
public class Verba {
    @Id private UUID id;
    @Column(name = "rubrica_id", nullable = false) private UUID rubricaId;
    @Column(length = 7, nullable = false)          private String periodo;
    @Column(name = "valor_bruto_total")            private BigDecimal valorBrutoTotal;
    @Column(name = "deducao_ecad")                 private BigDecimal deducaoEcad;
    @Column(name = "deducao_associacoes")          private BigDecimal deducaoAssociacoes;
    @Column(name = "verba_liquida")                private BigDecimal verbaLiquida;
    @Column(name = "quantidade_pagamentos")        private int quantidadePagamentos;
    @Enumerated(EnumType.STRING)                   private StatusVerba status;
    // join read-only para DTOs:
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rubrica_id", insertable = false, updatable = false)
    private Rubrica rubrica;

    public static Verba abrir(UUID rubricaId, String periodo) { /* zerada, status=ABERTA */ }

    public void recalcular(BigDecimal novoBruto, int qtdPagamentos) {
        if (status != StatusVerba.ABERTA) {
            throw new VerbaEmDistribuicaoException(
                "Verba %s/%s está %s e não pode ser alterada".formatted(rubricaId, periodo, status));
        }
        this.valorBrutoTotal    = scale(novoBruto);
        this.deducaoEcad        = scale(novoBruto.multiply(new BigDecimal("0.10")));
        this.deducaoAssociacoes = scale(novoBruto.multiply(new BigDecimal("0.05")));
        this.verbaLiquida       = scale(valorBrutoTotal
                                       .subtract(deducaoEcad)
                                       .subtract(deducaoAssociacoes));
        this.quantidadePagamentos = qtdPagamentos;
        this.atualizadoEm = Instant.now();
    }

    public void marcarEmDistribuicao() { /* ABERTA → EM_DISTRIBUICAO */ }
    public void marcarDistribuida()    { /* EM_DISTRIBUICAO → DISTRIBUIDA */ }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
```

Transições de status são **irreversíveis** (RF-12). Tentativa de retroceder lança `IllegalStateException`.

### Endpoints de API

| Método | Path | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/v1/verbas` | Lista detalhada paginada. Filtros: `rubricaSigla`, `periodo` (YYYY-MM ou range `periodoInicio/periodoFim`), `status`. Sort default `-periodo`. | analista/consultor arrecadacao |
| GET | `/api/v1/verbas/agregado-por-rubrica` | Lista agregada por rubrica (SUM bruto/líquida, count períodos). Filtros idem. Sort `rubricaSigla` ASC. | idem |
| GET | `/api/v1/verbas/{rubricaSigla}/{periodo}` | Busca específica. 404 se não existir. | idem |

Todos os endpoints são **read-only** (não há POST/PUT/DELETE — cálculo é 100% automático). Erros conformam RFC 7807 via `GlobalExceptionHandler` existente.

---

## Pontos de Integração

### Outbox — Evento Produzido

| Campo | Valor |
|-------|-------|
| `type` | `arrecadacao.verba.disponivel` |
| `routing_key` | `arrecadacao.verba.disponivel` |
| `subject` | `{rubricaSigla}:{periodo}` |
| `payload` | `{ rubricaSigla, rubricaNome, periodo, valorBrutoTotal, deducaoEcad, deducaoAssociacoes, verbaLiquida, quantidadePagamentos, status }` |

Publicado pelo `OutboxPublisherWorker` no exchange `arrecadacao.events` (já configurado). Atendendo RF-10, o evento é emitido **mesmo quando verba zera** após estorno total.

### RabbitMQ — Eventos Consumidos

Novo bean em `RabbitMqConfig`:

```java
@Bean TopicExchange distribuicaoEventsExchange(...);
@Bean Queue        distribuicaoProcessosQueue("arrecadacao.distribuicao.processos");
@Bean Binding      distribuicaoProcessosBinding(...);  // routing-key: distribuicao.processo.*
```

`DistribuicaoProcessoEventListener` (espelha `IdentityUserEventListener`):

```java
@RabbitListener(queues = "${app.distribuicao-events.queue}")
public void onMessage(Message message) {
    CloudEvent evt = parseCloudEvent(message);
    switch (evt.getType()) {
        case "distribuicao.processo.iniciado":
            verbaLockService.marcarEmDistribuicao(rubricaIdFrom(evt), periodoFrom(evt));
            break;
        case "distribuicao.processo.finalizado":
            verbaLockService.marcarDistribuida(rubricaIdFrom(evt), periodoFrom(evt));
            break;
        default:
            LOGGER.warn("Evento de distribuição ignorado: {}", evt.getType());
    }
}
```

Idempotência: se a verba já está no status alvo, o método é no-op silencioso (não relança exceção). A `rubricaId` é resolvida via `RubricaRepository.findBySigla(...)` — D04 emite `rubricaSigla` no payload, não UUID.

### Dependência externa pendente

D04 (`distribuicao-api`) ainda **não publica** `distribuicao.processo.iniciado/finalizado`. O consumer fica funcional aguardando os eventos; o lock só passa a ter efeito quando D04 (PRD `gestao-processos`) implementar a publicação via seu próprio Outbox. Até lá, todas as verbas permanecem `ABERTA` — pagamentos e estornos não são bloqueados.

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação |
|---|---|---|---|
| `VerbaService` (interface) | API quebrante | Renomeia `validarLockParaEstorno` → `validarLockParaAlteracao`; troca `rubricaSigla` por `rubricaId` em `recalcularVerba`. F06 ainda não implementado → baixo risco. | Atualizar `EstornarPagamentoCommandHandler` no escopo desta task |
| `VerbaServiceNoOp` | Remoção | Substituído por `VerbaServiceImpl`. | Remover classe + testes que referenciam |
| `RegistrarPagamentoCommandHandler` | Adição de dependência | Injeta `VerbaService`; adiciona validação de lock antes do save (`step 3.5`) e recálculo após save (`step 6.5`). Risco médio — alterar fluxo testado. | Cobertura por testes de integração existentes + novo cenário lock |
| `PagamentoRepository` | API estendida | Adiciona `sumAndCountConfirmados(rubricaId, periodo)`. Baixo risco — método novo. | — |
| `EstornarPagamentoCommandHandler` | Refatoração | Trocar `pagamento.getLicencaId()` por `pagamento.getLicenca().getRubricaId()` ao chamar lock; passar `rubricaId` em vez de sigla para recalcular. | Ajustar em duplas com refatoração da interface |
| Tabela `arrecadacao.verbas` | Schema novo | Nova tabela + índices. Baixo risco. | Migration V13 |
| `RabbitMqConfig` | Configuração estendida | Novos exchange/queue/binding para Distribuição. | Add bindings, env vars `DISTRIBUICAO_EVENTS_*` em `.env.example` |
| Frontend `arrecadacao/index.tsx` | Rota nova | `/arrecadacao/verbas`. | Registrar página + sidebar |

**Recursos compartilhados:** tabela `arrecadacao.outbox_events` recebe carga adicional (1 evento extra por pagamento e por estorno) — impacto desprezível.

---

## Abordagem de Testes

### Testes Unitários (`arrecadacao-tests/unit/`)

- **`VerbaTest`** — guards de transição de status, idempotência de `marcarEmDistribuicao`, scale correto (`0.10 × 1073.10 = 107.31`), bloqueio de `recalcular` quando `!ABERTA`.
- **`VerbaServiceImplTest`** — mocks de `VerbaRepository` + `PagamentoRepository` + `OutboxEventWriter` + `RubricaRepository`. Cenários:
  - Verba inexistente → cria com `Verba.abrir` e publica evento.
  - Verba existente → atualiza e publica evento.
  - Verba `EM_DISTRIBUICAO` → `recalcularVerba` propaga `VerbaEmDistribuicaoException`.
  - `validarLockParaAlteracao` com verba inexistente → no-op (não bloqueia primeiro pagamento).
- **`RegistrarPagamentoCommandHandlerTest`** — agora também verifica chamadas a `verbaService.validarLockParaAlteracao` e `verbaService.recalcularVerba`.
- **`DistribuicaoProcessoEventListenerTest`** — parsing de CloudEvent, dispatch correto por type, ignora types desconhecidos.

### Testes de Integração (`arrecadacao-tests/integration/`, Testcontainers PostgreSQL)

- **`VerbaPersistenceIT`** — unique constraint `(rubrica_id, periodo)`, lock FOR UPDATE serializa duas threads.
- **`VerbaRecalculoFlowIT`** — registrar 3 pagamentos via handler real; assert tabela `verbas` e evento outbox.
- **`VerbaLockIT`** — verba marcada `EM_DISTRIBUICAO`, novo `RegistrarPagamentoCommand` retorna 422.
- **`VerbaControllerIT`** — endpoints com filtros, paginação, ordenação, 404 em busca específica, 200 com agregado.
- **`DistribuicaoProcessoEventListenerIT`** — publica mensagem AMQP simulada → verba muda de status.

Cobertura mínima de lógica de negócio > 80% conforme `java-testing`.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Migration V13 + entidade `Verba` + enum `StatusVerba` + exceptions** — base do domínio, sem dependentes.
2. **`VerbaRepository` (interface + Jpa impl) + Spring Data** — habilita persistência.
3. **`PagamentoRepository.sumAndCountConfirmados`** — query agregada necessária para o serviço.
4. **Refatoração da interface `VerbaService`** — renomeia métodos; trocar `licencaId` por `rubricaId`; atualizar `EstornarPagamentoCommandHandler` no mesmo passo para o build não quebrar.
5. **`VerbaServiceImpl`** — substitui `VerbaServiceNoOp`; cálculo, upsert, evento outbox; testes unit.
6. **Integração com `RegistrarPagamentoCommandHandler`** — injeção, chamadas, testes ajustados.
7. **Queries + DTOs + `VerbaSpecification` + `VerbaController`** — endpoints de leitura.
8. **`RabbitMqConfig` extensão + `DistribuicaoProcessoEventListener`** — consumer; env vars e `.env.example`.
9. **Testes de integração** — full happy path + lock + consumer.
10. **Frontend** — types → api → hooks → components → pages → routing → sidebar.

### Dependências Técnicas

- PostgreSQL 16 (já em `docker-compose.dev.yml`).
- RabbitMQ 3.13 (já em `docker-compose.dev.yml`) — exchange `distribuicao.events` será criado pelo D04. Bean de exchange aqui usa `declare=true` para evitar erro em ambiente sem o D04 rodando.
- `EstornarPagamentoCommandHandler` (F06) ainda em fase `planned` — refatoração da interface é compatível pois o handler já existe no código, só será re-tocado.
- D04 publicação de `processo.iniciado/finalizado` — pendente; lock fica latente até lá.

---

## Monitoramento e Observabilidade

- **Logs estruturados** (SLF4J + Logback JSON) em `VerbaServiceImpl`: `rubricaId`, `periodo`, `valorBrutoTotal`, `verbaLiquida`, `quantidadePagamentos`, `acao=criar|atualizar`. Em `DistribuicaoProcessoEventListener`: `eventId`, `eventType`, `rubricaSigla`, `periodo`, `novoStatus`.
- **MDC** — propagar `rubrica` e `periodo` no contexto do handler para correlação com logs do `RegistrarPagamentoCommandHandler`.
- **Métricas Micrometer/Actuator** (já habilitadas):
  - `arrecadacao.verba.recalculo` (counter, tags: `rubrica`, `resultado=ok|locked`).
  - `arrecadacao.verba.evento.publicado` (counter, tag: `type`).
  - `arrecadacao.verba.lock.aplicado` (counter, tag: `acao=pagamento|estorno`).
- **Health check** — não há novo dependente externo; cobertura via `db` e `rabbit` checks já presentes.
- **Auditoria** — operações de F05 são automáticas (sistema), não geram evento de auditoria de usuário; apenas logs.

---

## Considerações Técnicas

### Decisões Principais

- **Recálculo síncrono dentro da transação do pagamento** (vs. job assíncrono). Garante consistência imediata e evento emitido na mesma unidade de trabalho do pagamento. Custo: latência adicional pequena (uma agregação + upsert). Justificativa: PRD exige < 1s e elimina janelas de inconsistência.
- **Lock pessimista `SELECT FOR UPDATE` em `Verba`** (vs. otimista com `@Version`). Serializa recálculos concorrentes da mesma chave; mais simples que retry. A escrita é curta (~10ms), portanto contenção é aceitável.
- **`Verba.recalcular` substitui valores integralmente** (vs. delta incremental). Evita drift acumulado de arredondamento — sempre recomputa a partir da soma dos confirmados.
- **`DECIMAL(15,2)`** (vs. `DECIMAL(18,6)` do `Pagamento`). Alinha com `distribuicao.snapshots_verba(D04)` e formato monetário R$ exibido na UI; a perda de precisão é absorvida com `setScale(2, HALF_UP)`.
- **`VerbaService` unificado**, sem `VerbaLockService` separado. Mantém uma única porta para Arrecadação; consumer chama métodos do agregado diretamente via repositório.
- **Consumer próprio (não compartilhado com identity-events)** — segregação por domínio de origem facilita governança das filas e dead-letter.

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| D04 não publica `processo.iniciado/finalizado` ainda — lock fica inerte | Documentar como dependência externa; consumer pronto. Não bloqueia F05. |
| Race condition em pagamentos simultâneos da mesma `(rubrica, periodo)` | `findByRubricaIdAndPeriodoForUpdate` com lock pessimista. |
| Arredondamento `(0.10 + 0.05) × bruto != bruto − líquida` | Calcular cada parcela com `setScale(2, HALF_UP)` e derivar líquida por subtração (não por `× 0.85` direto). |
| Falha do Outbox publisher → verba calculada mas evento não emitido | Outbox Pattern existente garante at-least-once; worker já reprocessa pendentes. |
| Crescimento da tabela `verbas` | Limitado por `rubrica × periodo` (~10 rubricas × meses) — projeto demo, não há concern. |

### Conformidade com Padrões

- **`java-architecture`** — Clean Architecture multi-módulo; `Verba` no `arrecadacao-domain`; `VerbaServiceImpl` no `arrecadacao-infra`; controller no `arrecadacao-api`.
- **`java-code-quality`** — Records para DTOs; guards de domínio com mensagens; sem `null` retornando de getters de coleção (preferir `Optional`).
- **`java-testing`** — AAA, Testcontainers, naming `methodName_Condition_ExpectedBehavior`.
- **`common-restful-api`** — Paginação `page/size`, `Sort` prefix `-`, RFC 7807 via `GlobalExceptionHandler` existente.
- **CloudEvents 1.0** — eventos seguem padrão já implementado por `RabbitMqPublisher`.
- **Schema-per-Service** — tudo dentro de `arrecadacao`; verba é consumida por D04 apenas via evento (sem JOIN cross-schema).

---

## Questões em Aberto

Todas resolvidas em 2026-05-11:

1. **Catálogo central de eventos** — ✅ `docs/events.md` atualizado: produzido `arrecadacao.verba.disponivel`, consumidos `distribuicao.processo.iniciado/finalizado` (marcados como planejados), matriz de consumo e pendência nº 6 adicionadas.
2. **Política de retentativa do consumer** — ✅ Seguir o padrão atual de `IdentityUserEventListener` (sem DLX explícito).
3. **F06 (Estorno) coordenação** — ✅ Refatoração da `VerbaService` será refletida no PRD `estorno-pagamento` pelo responsável quando ele for revisitado.

---

*Tech Spec gerada com a skill `create-techspec`. Próximo passo: gerar tasks com `create-tasks`.*
