# Tech Spec — F02: Gestão de Processos de Distribuição

> **PRD:** `tasks/distribuicao/prd-gestao-processos/prd.md`
> **API Contract:** `tasks/distribuicao/prd-gestao-processos/api-contract.yaml`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-04-10

---

## Resumo Executivo

Esta feature implementa o ciclo de vida do Processo de Distribuição no serviço `distribuicao-api` (já existente da F01). Envolve 4 blocos de trabalho: (1) consumo de eventos upstream para snapshots de Rol e Verba, (2) entidade Processo com máquina de estados encapsulada, (3) Outbox Pattern para publicação de eventos de ciclo de vida, e (4) endpoints REST + frontend.

O Outbox Pattern é a **maior adição arquitetural** — não existe na distribuicao-api (F01 é consumer-only). Deve ser portado do `arrecadacao-api`, incluindo entidade OutboxEvent, writer, publisher worker e exchange `distribuicao.events`.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | Clean Architecture, CQRS commands+queries, state machine no domain |
| `java-dependency-config` | Spring AMQP, CloudEvents, Flyway |
| `java-code-quality` | Records, enums, encapsulamento de estado |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers |
| `java-observability` | Logging por transição de estado |
| `react-architecture` | Feature module com pages, hooks, api, types |
| `common-restful-api` | RFC 7807, sub-resources para ações |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
                    RabbitMQ
                   ┌────────────────────────────────────┐
                   │                                    │
   identificacao   │   arrecadacao     distribuicao     │
   .events         │   .events        .events          │
   (exchange)      │   (exchange)     (exchange) [NEW]  │
       │           │       │               ▲            │
       │           │       │               │            │
       ▼           │       ▼               │            │
  ┌─────────┐      │  ┌─────────┐    ┌─────────┐       │
  │ distrib. │      │  │ distrib. │    │ Outbox  │       │
  │ .rol     │      │  │ .verba  │    │ Worker  │       │
  │ [queue]  │      │  │ [queue] │    │ (poll)  │       │
  └────┬─────┘      │  └────┬────┘    └────┬────┘       │
       │            │       │              │            │
       ▼            │       ▼              │            │
┌──────────────────────────────────────────┴────────────┐
│  distribuicao-api (Spring Boot, porta 5004)            │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ RolEvent    │  │ VerbaEvent  │  │ Outbox       │  │
│  │ Listener    │  │ Listener    │  │ Publisher    │  │
│  │ → Handler   │  │ → Handler   │  │ Worker       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
│         │                │                │           │
│         ▼                ▼                ▲           │
│  ┌─────────────────────────────────────────┐         │
│  │         PostgreSQL schema: distribuicao  │         │
│  │                                          │         │
│  │  rubricas  snapshots_rol  snapshots_verba│         │
│  │  processos  outbox_events                │         │
│  └─────────────────────────────────────────┘         │
│         │                                             │
│  ┌──────▼──────────────────────────┐                 │
│  │ ProcessoController              │                 │
│  │  GET  /processos/disponiveis    │                 │
│  │  GET  /processos                │                 │
│  │  POST /processos                │                 │
│  │  GET  /processos/{id}           │                 │
│  │  POST /processos/{id}/calcular  │                 │
│  │  POST /processos/{id}/aprovar   │                 │
│  │  POST /processos/{id}/finalizar │                 │
│  │  POST /processos/{id}/cancelar  │                 │
│  └─────────────────────────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Identificação** publica `identificacao.rol.fechado` → queue `distribuicao.rol` → `RolEventListener` → `RolEventHandler` persiste snapshot
2. **Arrecadação** publica `arrecadacao.verba.disponivel` → queue `distribuicao.verba` → `VerbaEventListener` → `VerbaEventHandler` persiste snapshot
3. **Analista** cria processo via API → `ProcessoCommandHandler` valida pré-requisitos (Rol+Verba exist, sem duplicata) → persiste processo + outbox event
4. **OutboxPublisherWorker** (scheduled) → publica eventos do outbox no exchange `distribuicao.events`

---

## Design de Implementação

### Entidade ProcessoDistribuicao (Domain)

A máquina de estados é **encapsulada na entidade** — transições são métodos que validam o estado atual antes de transicionar.

```java
@Entity
@Table(name = "processos", schema = "distribuicao")
public class ProcessoDistribuicao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false, length = 20)
    private String rubricaSigla;

    @Column(nullable = false, length = 7)
    private String periodo; // YYYY-MM

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusProcesso status;

    @Column(name = "verba_liquida", nullable = false, precision = 15, scale = 2)
    private BigDecimal verbaLiquida;

    @Column(name = "total_execucoes")
    private Integer totalExecucoes;

    @Column(name = "analista_responsavel", nullable = false, length = 200)
    private String analistaResponsavel;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "calculado_em")
    private Instant calculadoEm;

    @Column(name = "aprovado_em")
    private Instant aprovadoEm;

    @Column(name = "finalizado_em")
    private Instant finalizadoEm;

    @Column(name = "cancelado_em")
    private Instant canceladoEm;

    @Column(name = "justificativa_cancelamento", length = 500)
    private String justificativaCancelamento;

    // Snapshot references
    @Column(name = "snapshot_rol_id")
    private UUID snapshotRolId;

    @Column(name = "snapshot_verba_id")
    private UUID snapshotVerbaId;

    // Factory method
    public static ProcessoDistribuicao criar(
        String rubricaSigla, String periodo,
        BigDecimal verbaLiquida, String analistaResponsavel,
        UUID snapshotRolId, UUID snapshotVerbaId) { ... }

    // State transitions (throw IllegalStateException for invalid)
    public void marcarCalculado(int totalExecucoes) {
        validarTransicao(StatusProcesso.CRIADO, StatusProcesso.CALCULADO);
        this.status = StatusProcesso.CALCULADO;
        this.totalExecucoes = totalExecucoes;
        this.calculadoEm = Instant.now();
    }

    public void aprovar() {
        validarTransicao(StatusProcesso.CALCULADO, StatusProcesso.APROVADO);
        this.status = StatusProcesso.APROVADO;
        this.aprovadoEm = Instant.now();
    }

    public void finalizar() {
        validarTransicao(StatusProcesso.APROVADO, StatusProcesso.FINALIZADO);
        this.status = StatusProcesso.FINALIZADO;
        this.finalizadoEm = Instant.now();
    }

    public void cancelar(String justificativa) {
        if (this.status == StatusProcesso.FINALIZADO) {
            throw new TransicaoInvalidaException("Processo finalizado não pode ser cancelado");
        }
        this.status = StatusProcesso.CANCELADO;
        this.justificativaCancelamento = justificativa;
        this.canceladoEm = Instant.now();
    }

    private void validarTransicao(StatusProcesso esperado, StatusProcesso destino) {
        if (this.status != esperado) {
            throw new TransicaoInvalidaException(
                "Transição inválida: %s → %s".formatted(this.status, destino));
        }
    }
}
```

### Entidades de Snapshot (Domain)

```java
@Entity
@Table(name = "snapshots_rol", schema = "distribuicao")
public class SnapshotRol {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false) private String rubricaSigla;
    @Column(nullable = false) private String periodo;
    @Column(name = "captacao_id") private UUID captacaoId;
    @Column(name = "total_execucoes") private int totalExecucoes;
    @Column(name = "payload", columnDefinition = "TEXT") private String payload; // JSON do evento original
    @Column(nullable = false) private boolean cancelado;
    @Column(name = "recebido_em", nullable = false) private Instant recebidoEm;
}

@Entity
@Table(name = "snapshots_verba", schema = "distribuicao")
public class SnapshotVerba {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rubrica_sigla", nullable = false) private String rubricaSigla;
    @Column(nullable = false) private String periodo;
    @Column(name = "valor_bruto", precision = 15, scale = 2) private BigDecimal valorBruto;
    @Column(name = "deducao_ecad", precision = 15, scale = 2) private BigDecimal deducaoEcad;
    @Column(name = "deducao_associacoes", precision = 15, scale = 2) private BigDecimal deducaoAssociacoes;
    @Column(name = "verba_liquida", nullable = false, precision = 15, scale = 2) private BigDecimal verbaLiquida;
    @Column(name = "recebido_em", nullable = false) private Instant recebidoEm;
}
```

### Outbox Pattern (portado de arrecadacao-api)

```java
// Domain
@Entity @Table(name = "outbox_events", schema = "distribuicao")
public class OutboxEvent { ... } // Idêntico ao da arrecadação

public interface OutboxEventWriter {
    void addEvent(String eventType, String subject, Object data);
}

// Infra
@Component
public class OutboxEventWriterImpl implements OutboxEventWriter { ... }

@Component
public class RabbitMqPublisher {
    // Exchange: "distribuicao.events" (TopicExchange)
    // Source URN: "urn:distribuicao-api"
    // CloudEvents v1.0 format
}

@Component
public class OutboxPublisherWorker {
    // @Scheduled polling (5s default)
    // Batch 100, max 10 attempts
}
```

### Migrations

**V2__create_snapshots_and_processos.sql:**
```sql
-- Snapshots de Rol (Identificação)
CREATE TABLE distribuicao.snapshots_rol (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rubrica_sigla    VARCHAR(20)  NOT NULL,
    periodo          VARCHAR(7)   NOT NULL,
    captacao_id      UUID,
    total_execucoes  INTEGER      NOT NULL DEFAULT 0,
    payload          TEXT,
    cancelado        BOOLEAN      NOT NULL DEFAULT FALSE,
    recebido_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (rubrica_sigla, periodo, captacao_id)
);

-- Snapshots de Verba (Arrecadação)
CREATE TABLE distribuicao.snapshots_verba (
    id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    rubrica_sigla         VARCHAR(20)    NOT NULL,
    periodo               VARCHAR(7)     NOT NULL,
    valor_bruto           DECIMAL(15,2),
    deducao_ecad          DECIMAL(15,2),
    deducao_associacoes   DECIMAL(15,2),
    verba_liquida         DECIMAL(15,2)  NOT NULL,
    recebido_em           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (rubrica_sigla, periodo)
);

-- Processos de Distribuição
CREATE TABLE distribuicao.processos (
    id                          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    rubrica_sigla               VARCHAR(20)    NOT NULL,
    periodo                     VARCHAR(7)     NOT NULL,
    status                      VARCHAR(20)    NOT NULL DEFAULT 'CRIADO',
    verba_liquida               DECIMAL(15,2)  NOT NULL,
    total_execucoes             INTEGER,
    analista_responsavel        VARCHAR(200)   NOT NULL,
    snapshot_rol_id             UUID           REFERENCES distribuicao.snapshots_rol(id),
    snapshot_verba_id           UUID           REFERENCES distribuicao.snapshots_verba(id),
    criado_em                   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    calculado_em                TIMESTAMPTZ,
    aprovado_em                 TIMESTAMPTZ,
    finalizado_em               TIMESTAMPTZ,
    cancelado_em                TIMESTAMPTZ,
    justificativa_cancelamento  VARCHAR(500),
    CONSTRAINT uq_processo_ativo EXCLUDE USING btree (rubrica_sigla WITH =, periodo WITH =)
        WHERE (status != 'CANCELADO')
);

CREATE INDEX ix_processos_rubrica_periodo ON distribuicao.processos (rubrica_sigla, periodo);
CREATE INDEX ix_processos_status ON distribuicao.processos (status);

-- Outbox Events
CREATE TABLE distribuicao.outbox_events (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(100) NOT NULL,
    routing_key   VARCHAR(100) NOT NULL,
    subject       VARCHAR(255),
    payload       TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at  TIMESTAMPTZ,
    attempts      INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX ix_outbox_events_pending
    ON distribuicao.outbox_events (created_at)
    WHERE published_at IS NULL AND attempts < 10;
```

### RabbitMQ Config (adições)

```java
// Adicionar ao RabbitMqConfig.java existente:

// Exchange da Distribuição (para publicação)
@Bean
public TopicExchange distribuicaoEventsExchange() {
    return ExchangeBuilder.topicExchange("distribuicao.events").durable(true).build();
}

// Queues para snapshots
@Bean public Queue rolQueue() { return QueueBuilder.durable("distribuicao.rol").build(); }
@Bean public Queue verbaQueue() { return QueueBuilder.durable("distribuicao.verba").build(); }

// Exchange da Identificação (consumo)
@Bean public TopicExchange identificacaoEventsExchange() {
    return ExchangeBuilder.topicExchange("identificacao.events").durable(true).build();
}

// Bindings — Rol
@Bean public Binding bindRolFechado() {
    return BindingBuilder.bind(rolQueue()).to(identificacaoEventsExchange())
        .with("identificacao.rol.fechado");
}
@Bean public Binding bindRolCancelado() {
    return BindingBuilder.bind(rolQueue()).to(identificacaoEventsExchange())
        .with("identificacao.rol.cancelado");
}

// Bindings — Verba
@Bean public Binding bindVerbaDisponivel() {
    return BindingBuilder.bind(verbaQueue()).to(arrecadacaoEventsExchange())
        .with("arrecadacao.verba.disponivel");
}
```

### Endpoints de API

Conforme `api-contract.yaml` — 9 endpoints no `ProcessoController`.

### CQRS — Commands e Queries

**Commands (novos):**
- `CriarProcessoCommand(rubricaSigla, periodo, analistaResponsavel)` → handler valida pré-requisitos, cria processo, insere outbox event
- `AprovarProcessoCommand(processoId)` → handler transiciona estado, insere outbox
- `FinalizarProcessoCommand(processoId)` → handler transiciona, insere 2 outbox events (processo.finalizado + rol.processado)
- `CancelarProcessoCommand(processoId, justificativa)` → handler transiciona, insere outbox

**Queries (novas):**
- `ListarProcessosQuery(rubrica?, periodo?, status?, page, size, sort)` → handler com JPA Specification
- `BuscarProcessoPorIdQuery(id)` → handler simples
- `ListarDisponiveisQuery()` → handler cruza snapshots_rol + snapshots_verba - processos ativos

**Nota:** `calcular` é um command definido na F02 mas cuja lógica será completada na F03. Na F02, o handler pode fazer a transição de estado como stub (sem cálculo real) ou lançar `UnsupportedOperationException` até F03 ser implementada.

### Frontend

Adicionar ao módulo `features/distribuicao/`:

```
features/distribuicao/
├── rubricas/              (F01 — existente)
├── processos/             (F02 — NOVO)
│   ├── types/
│   │   └── processo.ts
│   ├── api/
│   │   └── processosApi.ts
│   ├── hooks/
│   │   ├── useProcessos.ts
│   │   ├── useProcesso.ts
│   │   ├── useDisponiveis.ts
│   │   └── useProcessoMutations.ts
│   ├── components/
│   │   ├── ProcessosTable.tsx
│   │   ├── ProcessoStatusBadge.tsx
│   │   ├── ProcessoActions.tsx
│   │   ├── DisponibilidadeList.tsx
│   │   ├── CancelarModal.tsx
│   │   └── FinalizarModal.tsx
│   ├── pages/
│   │   ├── ProcessosPage.tsx
│   │   ├── ProcessoDetailPage.tsx
│   │   └── CriarProcessoPage.tsx
│   └── index.ts
└── index.tsx              (router — MODIFICAR: adicionar rotas processos)
```

---

## Pontos de Integração

### RabbitMQ — Consumo

| Exchange | Queue | Routing Key | Handler |
|----------|-------|-------------|---------|
| `identificacao.events` | `distribuicao.rol` | `identificacao.rol.fechado` | `RolEventHandler` (upsert snapshot) |
| `identificacao.events` | `distribuicao.rol` | `identificacao.rol.cancelado` | `RolEventHandler` (marca cancelado) |
| `arrecadacao.events` | `distribuicao.verba` | `arrecadacao.verba.disponivel` | `VerbaEventHandler` (upsert snapshot) |

### RabbitMQ — Publicação (via Outbox)

| Evento | Routing Key | Payload |
|--------|-------------|---------|
| `distribuicao.processo.criado` | `distribuicao.processo.criado` | id, rubrica, periodo, verba, analista |
| `distribuicao.processo.calculado` | `distribuicao.processo.calculado` | id, rubrica, periodo, totalExecucoes |
| `distribuicao.processo.aprovado` | `distribuicao.processo.aprovado` | id, rubrica, periodo |
| `distribuicao.processo.finalizado` | `distribuicao.processo.finalizado` | id, rubrica, periodo |
| `distribuicao.processo.cancelado` | `distribuicao.processo.cancelado` | id, rubrica, periodo, justificativa |
| `distribuicao.rol.processado` | `distribuicao.rol.processado` | processoId, rubrica, periodo, captacaoId |

---

## Análise de Impacto

| Componente | Tipo | Descrição & Risco | Ação |
|---|---|---|---|
| `RabbitMqConfig.java` | Modificar | Adicionar exchange, queues e bindings (aditivo) | Baixo |
| `GlobalExceptionHandler.java` | Modificar | Adicionar handler para `TransicaoInvalidaException` (422) e `ConflictException` (409) | Baixo |
| `application.yml` | Modificar | Adicionar config de queues e outbox poll interval | Baixo |
| Frontend `index.tsx` (router) | Modificar | Adicionar rotas de processos | Baixo |
| Frontend `Sidebar.tsx` | Modificar | Adicionar sub-item "Processos" | Baixo |
| Identificação (D02) | Indireto | Precisa publicar `identificacao.rol.fechado` para que snapshots funcionem. Ainda não implementado (F05 da Identificação, prd-ready). Para testes locais, simular eventos manualmente. | Médio |
| Arrecadação (D03) | Indireto | Precisa publicar `arrecadacao.verba.disponivel`. Ainda não implementado (F05 da Arrecadação, prd-ready). Para testes locais, simular eventos manualmente. | Médio |

---

## Abordagem de Testes

### Testes Unitários

| Componente | Cenários |
|---|---|
| `ProcessoDistribuicao` (entity) | Todas as transições válidas; todas as transições inválidas; cancelamento de cada estado; factory method |
| `CriarProcessoCommandHandler` | Criação com pré-requisitos OK; Rol ausente (422); Verba ausente (422); Duplicata (409) |
| `AprovarProcessoCommandHandler` | Aprovação de CALCULADO; Rejeição de CRIADO |
| `FinalizarProcessoCommandHandler` | Finalização de APROVADO; Rejeição de outros estados |
| `CancelarProcessoCommandHandler` | Cancelamento de CRIADO/CALCULADO/APROVADO; Rejeição de FINALIZADO; Justificativa < 10 chars |
| `RolEventHandler` | Criar snapshot; Marcar cancelado; Idempotência |
| `VerbaEventHandler` | Criar snapshot; Atualizar snapshot; Idempotência |
| `ListarDisponiveisQueryHandler` | Combinações com Rol+Verba+sem processo; Filtro de cancelados |

### Testes de Integração

| Componente | Cenários |
|---|---|
| `ProcessoControllerIntegrationTest` | Fluxo completo: criar → aprovar → finalizar; Criar com conflito (409); Calcular stub; Cancelar com justificativa; Filtros e paginação; Transição inválida (422) |
| `RolEventListenerIntegrationTest` | CloudEvent → snapshot persistido; Cancelamento atualiza snapshot |
| `VerbaEventListenerIntegrationTest` | CloudEvent → snapshot persistido; Atualização incremental |
| `OutboxPublisherIntegrationTest` | Evento na tabela → publicado no RabbitMQ |

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Migration V2** — tabelas snapshots_rol, snapshots_verba, processos, outbox_events
2. **Domain: entidades** — ProcessoDistribuicao (com estado), SnapshotRol, SnapshotVerba, OutboxEvent, StatusProcesso enum, exceções
3. **Domain: interfaces** — ProcessoRepository, SnapshotRolRepository, SnapshotVerbaRepository, OutboxEventRepository, OutboxEventWriter
4. **Infra: repositórios JPA** — adapters para todas as interfaces
5. **Infra: Outbox Pattern** — OutboxEventWriterImpl, RabbitMqPublisher, OutboxPublisherWorker (portado de arrecadação)
6. **Infra: event consumers** — RolEventListener/Handler, VerbaEventListener/Handler
7. **Config: RabbitMQ** — exchange, queues, bindings adicionais
8. **Application: commands** — CriarProcesso, Aprovar, Finalizar, Cancelar (handlers com outbox)
9. **Application: queries** — ListarProcessos, BuscarPorId, ListarDisponiveis (com DTOs)
10. **API: controller** — ProcessoController com todos os endpoints
11. **API: exception handler** — TransicaoInvalidaException, ConflictException
12. **Testes unitários** — entity + handlers
13. **Testes integração** — controller + event listeners + outbox
14. **Frontend: tipos + API** — processo.ts, processosApi.ts
15. **Frontend: hooks** — useProcessos, useProcesso, useDisponiveis, useProcessoMutations
16. **Frontend: componentes + páginas** — tabela, detalhes, criação, modais
17. **Frontend: roteamento** — rotas + sidebar

### Dependências Técnicas

| Dependência | Status | Bloqueante? |
|---|---|---|
| F01 concluída (distribuicao-api existente) | Completa | Sim — resolvida |
| Eventos de Identificação (`rol.fechado`) | Não implementado | Não — simular via RabbitMQ Management UI para testes |
| Eventos de Arrecadação (`verba.disponivel`) | Não implementado | Não — simular via RabbitMQ Management UI para testes |

---

## Monitoramento e Observabilidade

### Logs

| Evento | Nível | Mensagem |
|---|---|---|
| Processo criado | INFO | `Processo criado: id={}, rubrica={}, periodo={}, analista={}` |
| Transição de estado | INFO | `Processo transicionado: id={}, {} → {}` |
| Processo cancelado | WARN | `Processo cancelado: id={}, justificativa={}` |
| Snapshot Rol recebido | INFO | `Snapshot Rol recebido: rubrica={}, periodo={}` |
| Snapshot Rol cancelado | WARN | `Snapshot Rol cancelado: rubrica={}, periodo={}` |
| Snapshot Verba recebido | INFO | `Snapshot Verba recebido: rubrica={}, periodo={}, verbaLiquida={}` |
| Outbox event publicado | DEBUG | `Outbox event publicado: id={}, type={}` |
| Pré-requisito ausente | WARN | `Criação rejeitada: {} (rubrica={}, periodo={})` |
| Transição inválida | WARN | `Transição inválida: id={}, {} → {}` |

### Health Check

- Spring Actuator `/actuator/health` — PostgreSQL + RabbitMQ (já configurado na F01).

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa | Alternativa Rejeitada |
|---|---|---|
| Máquina de estados no domain entity | Encapsula regras de transição; testável sem Spring | State machine library (Spring Statemachine) — overhead desnecessário |
| Outbox portado de arrecadacao-api | Padrão já validado no projeto; consistência | Publicação síncrona no RabbitMQ — sem garantia transacional |
| Snapshots como tabelas separadas | Desacoplamento temporal; Distribuição opera sem HTTP para Identificação/Arrecadação | Consulta HTTP direta — acoplamento runtime, falha parcial |
| EXCLUDE constraint para unicidade | PostgreSQL nativo; garante atomicamente 1 processo não-cancelado por rubrica+período | Validação no handler — race condition possível |
| `calcular` como stub na F02 | Define interface e contrato; F03 completa a lógica | Não definir endpoint — frontend não pode ser construído até F03 |
| Payload do snapshot Rol armazenado como JSON (TEXT) | F03 precisará do detalhe das execuções; evita segundo evento/consulta | Armazenar apenas metadados — F03 precisaria de nova integração |

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Eventos de Identificação/Arrecadação ainda não publicados | Simular via RabbitMQ Management UI; seed script para testes manuais |
| EXCLUDE constraint pode ter overhead em volume alto | Aceitável para PoC; volume esperado é baixo (< 100 processos) |
| Outbox worker competindo com transações longas de cálculo (F03) | Worker usa batch pequeno (100) e timeout curto; cálculo será em transação separada |

---

## Inventário de Artefatos

### Arquivos a Criar

#### Backend — Domain

| Caminho | Tipo | Descrição |
|---|---|---|
| `.../domain/entities/ProcessoDistribuicao.java` | Entidade | Processo com máquina de estados encapsulada |
| `.../domain/entities/SnapshotRol.java` | Entidade | Snapshot do Rol de Execuções |
| `.../domain/entities/SnapshotVerba.java` | Entidade | Snapshot da Verba disponível |
| `.../domain/entities/OutboxEvent.java` | Entidade | Evento de outbox (portado de arrecadação) |
| `.../domain/enums/StatusProcesso.java` | Enum | CRIADO, CALCULADO, APROVADO, FINALIZADO, CANCELADO |
| `.../domain/interfaces/ProcessoRepository.java` | Interface | findById, findAll (spec), existsAtivo, save |
| `.../domain/interfaces/SnapshotRolRepository.java` | Interface | findByRubricaAndPeriodo, upsert |
| `.../domain/interfaces/SnapshotVerbaRepository.java` | Interface | findByRubricaAndPeriodo, upsert |
| `.../domain/interfaces/OutboxEventRepository.java` | Interface | findPending, save |
| `.../domain/interfaces/OutboxEventWriter.java` | Interface | addEvent(type, subject, data) |
| `.../domain/exceptions/TransicaoInvalidaException.java` | Exceção | Transição de estado inválida |
| `.../domain/exceptions/ConflictException.java` | Exceção | Duplicidade de processo |
| `.../domain/exceptions/PreRequisitosException.java` | Exceção | Rol ou Verba ausentes |

> **Nota:** caminhos relativos a `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/`

#### Backend — Application

| Caminho | Tipo | Descrição |
|---|---|---|
| `.../application/commands/CriarProcessoCommand.java` | Command | rubricaSigla, periodo, analistaResponsavel |
| `.../application/commands/AprovarProcessoCommand.java` | Command | processoId |
| `.../application/commands/FinalizarProcessoCommand.java` | Command | processoId |
| `.../application/commands/CancelarProcessoCommand.java` | Command | processoId, justificativa |
| `.../application/commands/CalcularProcessoCommand.java` | Command | processoId (stub na F02, lógica na F03) |
| `.../application/commands/handlers/CriarProcessoCommandHandler.java` | Handler | Validação + criação + outbox |
| `.../application/commands/handlers/AprovarProcessoCommandHandler.java` | Handler | Transição + outbox |
| `.../application/commands/handlers/FinalizarProcessoCommandHandler.java` | Handler | Transição + 2 outbox events |
| `.../application/commands/handlers/CancelarProcessoCommandHandler.java` | Handler | Validação justificativa + transição + outbox |
| `.../application/commands/handlers/CalcularProcessoCommandHandler.java` | Handler | Stub (placeholder para F03) |
| `.../application/queries/ListarProcessosQuery.java` | Query | Filtros + paginação |
| `.../application/queries/BuscarProcessoPorIdQuery.java` | Query | processoId |
| `.../application/queries/ListarDisponiveisQuery.java` | Query | Sem parâmetros |
| `.../application/queries/handlers/ListarProcessosQueryHandler.java` | Handler | JPA Specification + paginação |
| `.../application/queries/handlers/BuscarProcessoPorIdQueryHandler.java` | Handler | findById ou NotFoundException |
| `.../application/queries/handlers/ListarDisponiveisQueryHandler.java` | Handler | Cruzar snapshots_rol + verba - processos ativos |
| `.../application/dto/ProcessoResponse.java` | DTO | Record com factory from(entity) |
| `.../application/dto/DisponibilidadeResponse.java` | DTO | Record (rubrica, periodo, verbaLiquida, totalExecucoes) |
| `.../application/dto/CriarProcessoRequest.java` | DTO | Record (rubricaSigla, periodo) |
| `.../application/dto/CancelarProcessoRequest.java` | DTO | Record (justificativa) |
| `.../application/dto/RubricaResumoDto.java` | DTO | Record (sigla, nome) |

> **Nota:** caminhos relativos a `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/`

#### Backend — Infra

| Caminho | Tipo | Descrição |
|---|---|---|
| `.../infra/persistence/SpringDataProcessoRepository.java` | Repo | JpaRepository + custom queries |
| `.../infra/persistence/JpaProcessoRepository.java` | Repo | Adapter |
| `.../infra/persistence/SpringDataSnapshotRolRepository.java` | Repo | JpaRepository |
| `.../infra/persistence/JpaSnapshotRolRepository.java` | Repo | Adapter |
| `.../infra/persistence/SpringDataSnapshotVerbaRepository.java` | Repo | JpaRepository |
| `.../infra/persistence/JpaSnapshotVerbaRepository.java` | Repo | Adapter |
| `.../infra/persistence/SpringDataOutboxEventRepository.java` | Repo | JpaRepository + findPending |
| `.../infra/persistence/JpaOutboxEventRepository.java` | Repo | Adapter |
| `.../infra/persistence/ProcessoSpecification.java` | Spec | JPA Specification para filtros dinâmicos |
| `.../infra/events/OutboxEventWriterImpl.java` | Service | Serializa payload + persiste outbox event |
| `.../infra/events/RabbitMqPublisher.java` | Service | CloudEvent → RabbitMQ (exchange distribuicao.events) |
| `.../infra/events/OutboxPublisherWorker.java` | Worker | Scheduled poll + publish + mark |
| `.../infra/events/RolEventListener.java` | Listener | @RabbitListener para queue distribuicao.rol |
| `.../infra/events/RolEventHandler.java` | Handler | Upsert/cancelar snapshot Rol |
| `.../infra/events/RolEventPayload.java` | DTO | Record para payload do CloudEvent |
| `.../infra/events/VerbaEventListener.java` | Listener | @RabbitListener para queue distribuicao.verba |
| `.../infra/events/VerbaEventHandler.java` | Handler | Upsert snapshot Verba |
| `.../infra/events/VerbaEventPayload.java` | DTO | Record para payload do CloudEvent |
| `...distribuicao-infra/src/main/resources/db/migration/V2__create_snapshots_processos_outbox.sql` | Migration | 4 tabelas + índices + constraint |

> **Nota:** caminhos relativos a `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/`

#### Backend — API

| Caminho | Tipo | Descrição |
|---|---|---|
| `.../api/controllers/ProcessoController.java` | Controller | 9 endpoints do contract |

> **Nota:** caminho relativo a `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/`

#### Backend — Testes

| Caminho | Tipo | Descrição |
|---|---|---|
| `.../tests/unit/ProcessoDistribuicaoTest.java` | Teste | Máquina de estados (todas as transições) |
| `.../tests/unit/CriarProcessoCommandHandlerTest.java` | Teste | Pré-requisitos, duplicata, happy path |
| `.../tests/unit/TransicoesCommandHandlerTest.java` | Teste | Aprovar, finalizar, cancelar |
| `.../tests/unit/SnapshotHandlersTest.java` | Teste | RolEventHandler + VerbaEventHandler |
| `.../tests/unit/ListarDisponiveisQueryHandlerTest.java` | Teste | Cruzamento snapshots - processos |
| `.../tests/integration/ProcessoControllerIntegrationTest.java` | Teste | Fluxo completo + erros |
| `.../tests/integration/SnapshotEventListenerIntegrationTest.java` | Teste | CloudEvent → PostgreSQL |
| `.../tests/integration/OutboxPublisherIntegrationTest.java` | Teste | Outbox → RabbitMQ |

> **Nota:** caminhos relativos a `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/`

#### Frontend

| Caminho | Tipo | Descrição |
|---|---|---|
| `frontend/src/features/distribuicao/processos/types/processo.ts` | Tipo | Interfaces TypeScript |
| `frontend/src/features/distribuicao/processos/api/processosApi.ts` | API | Funções fetch (listar, criar, transições) |
| `frontend/src/features/distribuicao/processos/hooks/useProcessos.ts` | Hook | TanStack Query (listagem paginada) |
| `frontend/src/features/distribuicao/processos/hooks/useProcesso.ts` | Hook | TanStack Query (detalhe por id) |
| `frontend/src/features/distribuicao/processos/hooks/useDisponiveis.ts` | Hook | TanStack Query (combinações disponíveis) |
| `frontend/src/features/distribuicao/processos/hooks/useProcessoMutations.ts` | Hook | useMutation (criar, aprovar, finalizar, cancelar) |
| `frontend/src/features/distribuicao/processos/components/ProcessosTable.tsx` | Componente | Tabela paginada com filtros |
| `frontend/src/features/distribuicao/processos/components/ProcessoStatusBadge.tsx` | Componente | Badge colorido por status |
| `frontend/src/features/distribuicao/processos/components/ProcessoActions.tsx` | Componente | Botões de ação por estado |
| `frontend/src/features/distribuicao/processos/components/DisponibilidadeList.tsx` | Componente | Cards de combinações disponíveis |
| `frontend/src/features/distribuicao/processos/components/CancelarModal.tsx` | Componente | Modal com textarea justificativa |
| `frontend/src/features/distribuicao/processos/components/FinalizarModal.tsx` | Componente | Modal de confirmação irreversível |
| `frontend/src/features/distribuicao/processos/pages/ProcessosPage.tsx` | Página | Listagem com filtros |
| `frontend/src/features/distribuicao/processos/pages/ProcessoDetailPage.tsx` | Página | Detalhes + ações + timeline |
| `frontend/src/features/distribuicao/processos/pages/CriarProcessoPage.tsx` | Página | Seleção de disponíveis + criação |
| `frontend/src/features/distribuicao/processos/index.ts` | Barrel | Exports |

### Arquivos a Modificar

| Caminho | Alteração |
|---|---|
| `.../api/config/RabbitMqConfig.java` | Adicionar exchange distribuicao.events, queues rol/verba, bindings |
| `.../api/config/GlobalExceptionHandler.java` | Adicionar handlers para TransicaoInvalidaException (422), ConflictException (409), PreRequisitosException (422) |
| `.../api/src/main/resources/application.yml` | Adicionar queues distribuicao.rol e distribuicao.verba, outbox poll interval, exchange name |
| `frontend/src/features/distribuicao/index.tsx` | Adicionar rotas de processos (listagem, detalhes, criação) |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Adicionar sub-item "Processos" em Distribuição |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---|---|
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/.../entities/OutboxEvent.java` | Portar Outbox entity |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/.../events/OutboxEventWriterImpl.java` | Portar Outbox writer |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/.../events/RabbitMqPublisher.java` | Portar publisher |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/.../events/OutboxPublisherWorker.java` | Portar worker |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/.../persistence/JpaOutboxEventRepository.java` | Portar repo |
| `services/distribuicao-api/distribuicao-infra/src/main/java/.../events/RubricaEventListener.java` | Padrão de listener existente |
| `services/distribuicao-api/distribuicao-api/src/main/java/.../controllers/RubricaController.java` | Padrão de controller existente |
| `tasks/distribuicao/prd-gestao-processos/api-contract.yaml` | Contrato de API |
| `frontend/src/features/distribuicao/rubricas/` | Padrão de feature module frontend |
| `frontend/src/features/arrecadacao/pagamentos/` | Referência de listagem com paginação e filtros |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*
