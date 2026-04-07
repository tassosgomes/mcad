# Tech Spec — F04: Registro de Pagamentos (Backend)

> **PRD:** `tasks/arrecadacao/prd-registro-pagamentos/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-registro-pagamentos/api-contract.yaml`
> **Data:** 2026-04-05

---

## Resumo Executivo

Terceira feature CRUD do serviço `arrecadacao-api`. Introduz duas novas entidades: UdaValor (entidade global append-only com histórico de valores) e Pagamento (registro financeiro em UDAs contra licença). Valores monetários em `BigDecimal` com 6 casas decimais. Pagamento calcula `valorBruto = quantidadeUdas × valorUdaVigente` e grava snapshot imutável. Unicidade via partial unique index `(licenca_id, periodo) WHERE status = 'CONFIRMADO'`. Período auto-preenchido com mês corrente. Publica evento `arrecadacao.pagamento.registrado` via Outbox Pattern.

Reutiliza toda a infraestrutura CQRS, Repository Pattern, Exception Handling e Outbox Pattern estabelecida em F01/F02/F03.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | CQRS, Repository, Outbox Pattern, @ManyToOne para joins |
| `java-dependency-config` | Spring Data JPA, Flyway, BigDecimal |
| `java-code-quality` | Records, factory methods, domain logic em entidade |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers |
| `common-restful-api` | Paginação, sort, RFC 7807, 409 para conflito |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
API Layer (arrecadacao-api)
  ├─ UdaController
  │    ├─ GET    /uda/vigente        → QueryDispatcher → ConsultarUdaVigenteQuery
  │    ├─ POST   /uda                → CommandDispatcher → AjustarUdaCommand
  │    └─ GET    /uda/historico      → QueryDispatcher → ListarHistoricoUdaQuery
  └─ PagamentoController
       ├─ GET    /pagamentos         → QueryDispatcher → ListarPagamentosQuery
       ├─ POST   /pagamentos         → CommandDispatcher → RegistrarPagamentoCommand
       └─ GET    /pagamentos/{id}    → QueryDispatcher → BuscarPagamentoPorIdQuery

Application Layer (arrecadacao-application)
  ├─ Commands: AjustarUda, RegistrarPagamento
  ├─ Queries: ConsultarUdaVigente, ListarHistoricoUda, ListarPagamentos, BuscarPagamentoPorId
  ├─ Handlers: um por Command/Query
  ├─ DTOs: UdaResponse, PagamentoResponse, LicencaResumo, etc.
  └─ Specification: PagamentoSpecification (5 filtros com joins)

Domain Layer (arrecadacao-domain)
  ├─ Entities: UdaValor, Pagamento
  ├─ Enums: StatusPagamento (CONFIRMADO, ESTORNADO)
  └─ Interfaces: UdaValorRepository, PagamentoRepository

Infrastructure Layer (arrecadacao-infra)
  ├─ Repositories: Jpa + SpringData para UdaValor e Pagamento
  └─ Migrations: V7 (uda_valor + seed), V8 (pagamento + partial unique)
```

---

## Design de Implementação

### Domain Layer

#### Enum: StatusPagamento

```java
public enum StatusPagamento {
    CONFIRMADO, ESTORNADO
}
```

#### Entity: UdaValor

```java
@Entity
@Table(name = "uda_valor", schema = "arrecadacao")
public class UdaValor {
    @Id
    private UUID id;

    @Column(name = "valor", precision = 18, scale = 6, nullable = false)
    private BigDecimal valor;

    @Column(name = "data_vigencia", nullable = false)
    private LocalDate dataVigencia;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "criado_por", length = 200)
    private String criadoPor;  // nullable for seed

    protected UdaValor() {}

    public static UdaValor criar(BigDecimal valor, LocalDate dataVigencia, String criadoPor) {
        // Validates: valor != null && valor.compareTo(BigDecimal.ZERO) > 0
        // Validates: dataVigencia != null
        // Sets: id = UUID.randomUUID(), criadoEm = Instant.now()
    }

    // Getters only. Immutable after creation (append-only).
}
```

#### Entity: Pagamento

```java
@Entity
@Table(name = "pagamento", schema = "arrecadacao")
public class Pagamento {
    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Column(name = "quantidade_udas", precision = 18, scale = 6, nullable = false)
    private BigDecimal quantidadeUdas;

    @Column(name = "valor_uda_no_momento", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorUdaNoMomento;

    @Column(name = "valor_bruto", precision = 18, scale = 6, nullable = false)
    private BigDecimal valorBruto;

    @Column(name = "periodo", length = 7, nullable = false)
    private String periodo;  // YYYY-MM

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private StatusPagamento status;

    @Column(name = "data_registro", nullable = false)
    private Instant dataRegistro;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    // Read-only joins for Specification and DTO mapping
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "licenca_id", insertable = false, updatable = false)
    private Licenca licenca;

    protected Pagamento() {}

    public static Pagamento registrar(UUID licencaId, BigDecimal quantidadeUdas,
                                       BigDecimal valorUdaVigente) {
        // Validates: quantidadeUdas > 0
        // Calculates: valorBruto = quantidadeUdas.multiply(valorUdaVigente)
        // Sets: valorUdaNoMomento = valorUdaVigente (snapshot imutável)
        // Sets: periodo = YearMonth.now().toString() (YYYY-MM)
        // Sets: status = CONFIRMADO, dataRegistro = criadoEm = atualizadoEm = Instant.now()
        // Sets: id = UUID.randomUUID()
    }

    public void estornar() {
        // Guard: status must be CONFIRMADO
        // Sets: status = ESTORNADO, atualizadoEm = Instant.now()
        // Nota: usado por F06 (Estorno) — preparar domain method agora
    }

    // Getters only (no setters). quantidadeUdas, valorUdaNoMomento, valorBruto são imutáveis.
}
```

**Decisão: `BigDecimal` com `precision=18, scale=6`** — 6 casas decimais para UDAs e valores monetários. Consistente com o SQL do PRD (`NUMERIC(18,6)`).

#### Repository Interfaces

```java
public interface UdaValorRepository {
    UdaValor save(UdaValor entity);
    Optional<UdaValor> findVigente(LocalDate data);
    List<UdaValor> findAllOrderByDataVigenciaDesc();
}

public interface PagamentoRepository {
    Pagamento save(Pagamento entity);
    Optional<Pagamento> findById(UUID id);
    Page<Pagamento> findAll(Specification<Pagamento> spec, Pageable pageable);
    boolean existsConfirmadoByLicencaIdAndPeriodo(UUID licencaId, String periodo);
}
```

### Application Layer

#### Commands

```java
public record AjustarUdaCommand(
    BigDecimal valor, LocalDate dataVigencia, String autor
) implements Command<UdaResponse> {}

public record RegistrarPagamentoCommand(
    UUID licencaId, BigDecimal quantidadeUdas, String autor
) implements Command<PagamentoResponse> {}
```

#### Queries

```java
public record ConsultarUdaVigenteQuery() implements Query<UdaResponse> {}

public record ListarHistoricoUdaQuery() implements Query<List<UdaResponse>> {}

public record ListarPagamentosQuery(
    int page, int size, String sort,
    UUID usuarioMusicaId, String razaoSocial,
    String rubricaSigla, String periodo,
    StatusPagamento status
) implements Query<PageResponse<PagamentoResponse>> {}

public record BuscarPagamentoPorIdQuery(UUID id) implements Query<PagamentoResponse> {}
```

#### Command Handlers

**AjustarUdaCommandHandler:**
1. `UdaValor.criar(cmd.valor(), cmd.dataVigencia(), cmd.autor())`
2. `udaValorRepository.save(udaValor)`
3. Mapear para `UdaResponse`

**RegistrarPagamentoCommandHandler:**
1. `licencaRepository.findById(cmd.licencaId())` → 404
2. Validar `licenca.getStatus()` é ATIVA ou SUSPENSA → 422 se ENCERRADA
3. `udaValorRepository.findVigente(LocalDate.now())` → 422 se vazio ("Não há valor de UDA vigente")
4. Validar unicidade: `pagamentoRepository.existsConfirmadoByLicencaIdAndPeriodo(licencaId, periodo)` → 409 se true
5. `Pagamento.registrar(licencaId, quantidadeUdas, udaVigente.getValor())`
6. `pagamentoRepository.save(pagamento)`
7. Publicar evento via `outboxEventWriter.addEvent("arrecadacao.pagamento.registrado", pagamento.getId().toString(), eventPayload)`
8. Mapear para `PagamentoResponse` com licença expandida

**Nota sobre unicidade:** Validação aplicacional (step 4) + constraint de banco (partial unique). Se race condition, `DataIntegrityViolationException` capturada pelo GlobalExceptionHandler → 409.

**Nota sobre Outbox:** Evento publicado na mesma transação que o save do pagamento (garantia de consistência).

#### Specification: PagamentoSpecification

```java
public class PagamentoSpecification {
    public static Specification<Pagamento> comFiltros(
            UUID usuarioMusicaId, String razaoSocial,
            String rubricaSigla, String periodo,
            StatusPagamento status) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaIgual(rubricaSigla))
                .and(periodoIgual(periodo))
                .and(statusIgual(status));
    }

    // usuarioMusicaId: join licenca → usuarioMusicaId exact
    // razaoSocial: join licenca → usuarioMusica → razaoSocial ILIKE
    // rubricaSigla: join licenca → rubrica → sigla ILIKE
    // periodo: exact match on pagamento.periodo
    // status: exact match on pagamento.status
}
```

**Joins via @ManyToOne:** Pagamento → Licenca (direto), Licenca → UsuarioMusica e Rubrica (lazy, insertable=false, updatable=false — já configurados no F03).

#### DTOs

```java
// UDA
public record UdaResponse(
    UUID id, String valor, LocalDate dataVigencia,
    Instant criadoEm, String criadoPor
) {}

public record AjustarUdaRequest(
    @NotNull BigDecimal valor,  // Bean Validation: > 0
    @NotNull LocalDate dataVigencia
) {}

// Pagamento
public record PagamentoResponse(
    UUID id, LicencaResumoResponse licenca,
    String quantidadeUdas, String valorUdaNoMomento, String valorBruto,
    String periodo, String status,
    Instant dataRegistro, Instant criadoEm, Instant atualizadoEm
) {}

public record RegistrarPagamentoRequest(
    @NotNull UUID licencaId,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal quantidadeUdas
) {}

// Sub-responses (reutilizam F03)
public record LicencaResumoResponse(
    UUID id, String status,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica
) {}
```

**BigDecimal → String no JSON:** Para respostas, converter `BigDecimal` para `String` no mapeamento DTO (ex: `pagamento.getValorBruto().toPlainString()`). Para requests, aceitar como `BigDecimal` (Jackson deserializa de string ou número).

### Modelos de Dados (Flyway Migrations)

#### V7__create_uda_valor.sql

```sql
CREATE TABLE arrecadacao.uda_valor (
    id            UUID         PRIMARY KEY,
    valor         NUMERIC(18,6) NOT NULL CHECK (valor > 0),
    data_vigencia DATE          NOT NULL,
    criado_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_por    VARCHAR(200)
);

CREATE INDEX ix_uda_valor_vigencia
    ON arrecadacao.uda_valor (data_vigencia DESC);

-- Seed: valor inicial R$ 107,31
INSERT INTO arrecadacao.uda_valor (id, valor, data_vigencia, criado_em, criado_por)
VALUES ('d1e2f3a4-b5c6-7890-abcd-111111111111', 107.310000, '2026-01-01', NOW(), NULL)
ON CONFLICT DO NOTHING;
```

#### V8__create_pagamento.sql

```sql
CREATE TABLE arrecadacao.pagamento (
    id                    UUID          PRIMARY KEY,
    licenca_id            UUID          NOT NULL REFERENCES arrecadacao.licencas(id),
    quantidade_udas       NUMERIC(18,6) NOT NULL CHECK (quantidade_udas > 0),
    valor_uda_no_momento  NUMERIC(18,6) NOT NULL,
    valor_bruto           NUMERIC(18,6) NOT NULL,
    periodo               CHAR(7)       NOT NULL,
    status                VARCHAR(20)   NOT NULL DEFAULT 'CONFIRMADO',
    data_registro         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    criado_em             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    atualizado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_pagamento_status CHECK (status IN ('CONFIRMADO', 'ESTORNADO'))
);

-- Unicidade: 1 pagamento CONFIRMADO por licença+período
CREATE UNIQUE INDEX uq_pagamento_licenca_periodo_confirmado
    ON arrecadacao.pagamento (licenca_id, periodo)
    WHERE status = 'CONFIRMADO';

CREATE INDEX ix_pagamento_licenca_id ON arrecadacao.pagamento (licenca_id);
CREATE INDEX ix_pagamento_periodo ON arrecadacao.pagamento (periodo);
CREATE INDEX ix_pagamento_status ON arrecadacao.pagamento (status);
CREATE INDEX ix_pagamento_data_registro ON arrecadacao.pagamento (data_registro DESC);
```

### API Layer

#### UdaController

```java
@RestController
@RequestMapping("/api/v1/uda")
@Tag(name = "UDA")
public class UdaController {
    // GET  /uda/vigente    — ambos os perfis
    // POST /uda            — @PreAuthorize analista
    // GET  /uda/historico  — ambos os perfis
}
```

#### PagamentoController

```java
@RestController
@RequestMapping("/api/v1/pagamentos")
@Tag(name = "Pagamentos")
public class PagamentoController {
    // GET  /pagamentos     — ambos os perfis
    // POST /pagamentos     — @PreAuthorize analista
    // GET  /pagamentos/{id} — ambos os perfis
}
```

### Endpoints de API

| Método | Path | Auth | operationId |
|--------|------|------|-------------|
| `GET` | `/api/v1/uda/vigente` | JWT Bearer | `consultarUdaVigente` |
| `POST` | `/api/v1/uda` | JWT (Analista) | `ajustarUda` |
| `GET` | `/api/v1/uda/historico` | JWT Bearer | `listarHistoricoUda` |
| `GET` | `/api/v1/pagamentos` | JWT Bearer | `listarPagamentos` |
| `POST` | `/api/v1/pagamentos` | JWT (Analista) | `registrarPagamento` |
| `GET` | `/api/v1/pagamentos/{id}` | JWT Bearer | `buscarPagamentoPorId` |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `arrecadacao-domain/.../domain/enums/StatusPagamento.java` | Enum | CONFIRMADO, ESTORNADO |
| `arrecadacao-domain/.../domain/entities/UdaValor.java` | Entity | Append-only, factory `criar()` |
| `arrecadacao-domain/.../domain/entities/Pagamento.java` | Entity | Factory `registrar()`, domain method `estornar()` |
| `arrecadacao-domain/.../domain/interfaces/UdaValorRepository.java` | Interface | findVigente, findAll |
| `arrecadacao-domain/.../domain/interfaces/PagamentoRepository.java` | Interface | findAll(Spec,Pageable), existsConfirmado |
| `arrecadacao-domain/.../domain/exceptions/PagamentoDuplicadoException.java` | Exception | 409 Conflict |
| `arrecadacao-domain/.../domain/exceptions/UdaVigenteNaoEncontradaException.java` | Exception | 422 |
| `arrecadacao-infra/.../resources/db/migration/V7__create_uda_valor.sql` | Migration | Tabela + seed R$ 107,31 |
| `arrecadacao-infra/.../resources/db/migration/V8__create_pagamento.sql` | Migration | Tabela + partial unique |
| `arrecadacao-infra/.../infra/persistence/SpringDataUdaValorRepository.java` | Repository | Spring Data |
| `arrecadacao-infra/.../infra/persistence/JpaUdaValorRepository.java` | Repository | Adapter |
| `arrecadacao-infra/.../infra/persistence/SpringDataPagamentoRepository.java` | Repository | Spring Data + JpaSpecificationExecutor |
| `arrecadacao-infra/.../infra/persistence/JpaPagamentoRepository.java` | Repository | Adapter |
| `arrecadacao-application/.../application/commands/AjustarUdaCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/RegistrarPagamentoCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/handlers/AjustarUdaCommandHandler.java` | Handler | Criar UdaValor |
| `arrecadacao-application/.../application/commands/handlers/RegistrarPagamentoCommandHandler.java` | Handler | Validar licença+UDA+unicidade, calcular, publicar evento |
| `arrecadacao-application/.../application/queries/ConsultarUdaVigenteQuery.java` | Query | Record |
| `arrecadacao-application/.../application/queries/ListarHistoricoUdaQuery.java` | Query | Record |
| `arrecadacao-application/.../application/queries/ListarPagamentosQuery.java` | Query | Record com filtros |
| `arrecadacao-application/.../application/queries/BuscarPagamentoPorIdQuery.java` | Query | Record |
| `arrecadacao-application/.../application/queries/handlers/ConsultarUdaVigenteQueryHandler.java` | Handler | findVigente |
| `arrecadacao-application/.../application/queries/handlers/ListarHistoricoUdaQueryHandler.java` | Handler | findAll |
| `arrecadacao-application/.../application/queries/handlers/ListarPagamentosQueryHandler.java` | Handler | Specification + Pageable |
| `arrecadacao-application/.../application/queries/handlers/BuscarPagamentoPorIdQueryHandler.java` | Handler | findById |
| `arrecadacao-application/.../application/specification/PagamentoSpecification.java` | Specification | 5 filtros com joins |
| `arrecadacao-application/.../application/dto/UdaResponse.java` | DTO | Response |
| `arrecadacao-application/.../application/dto/AjustarUdaRequest.java` | DTO | Request com Bean Validation |
| `arrecadacao-application/.../application/dto/PagamentoResponse.java` | DTO | Response com licença expandida |
| `arrecadacao-application/.../application/dto/RegistrarPagamentoRequest.java` | DTO | Request |
| `arrecadacao-application/.../application/dto/LicencaResumoResponse.java` | DTO | Sub-response (se não existir do F03) |
| `arrecadacao-api/.../api/controllers/UdaController.java` | Controller | 3 endpoints |
| `arrecadacao-api/.../api/controllers/PagamentoController.java` | Controller | 3 endpoints |
| `arrecadacao-domain/src/test/.../domain/entities/UdaValorTest.java` | Teste | Unitário |
| `arrecadacao-domain/src/test/.../domain/entities/PagamentoTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../commands/handlers/AjustarUdaCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../commands/handlers/RegistrarPagamentoCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../queries/handlers/ListarPagamentosQueryHandlerTest.java` | Teste | Unitário |
| `arrecadacao-tests/src/test/.../infra/persistence/PagamentoPersistenceIntegrationTest.java` | Teste | Integração Testcontainers |
| `arrecadacao-tests/src/test/.../api/PagamentoEndpointsIntegrationTest.java` | Teste | Integração HTTP |
| `arrecadacao-tests/src/test/.../api/UdaEndpointsIntegrationTest.java` | Teste | Integração HTTP |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `arrecadacao-api/.../api/config/GlobalExceptionHandler.java` | Adicionar handlers: PagamentoDuplicadoException → 409, UdaVigenteNaoEncontradaException → 422 |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `arrecadacao-domain/.../domain/entities/Licenca.java` | Validar status ATIVA/SUSPENSA |
| `arrecadacao-domain/.../domain/interfaces/LicencaRepository.java` | Consulta no RegistrarPagamentoHandler |
| `arrecadacao-domain/.../domain/entities/OutboxEvent.java` | Padrão de evento Outbox |
| `arrecadacao-domain/.../domain/interfaces/OutboxEventWriter.java` | Interface para publicar evento |
| `arrecadacao-application/.../application/cqrs/*.java` | CQRS foundation reutilizada |
| `arrecadacao-application/.../application/dto/PageResponse.java` | DTO paginação |
| `arrecadacao-application/.../application/dto/UsuarioMusicaResumoResponse.java` | Sub-DTO reutilizado |
| `arrecadacao-application/.../application/dto/RubricaResumoResponse.java` | Sub-DTO reutilizado |

---

## Análise de Impacto

| Componente | Tipo | Descrição & Risco | Ação |
|------------|------|-------------------|------|
| Schema `arrecadacao` | Novas tabelas | 2 tabelas + seed. Sem impacto em existentes | V7 + V8 |
| F03 (Licença) | Dependência leitura | RegistrarPagamentoHandler consulta status | F03 deve estar implementado |
| F05 (Verba) — downstream | Evento | Consome `arrecadacao.pagamento.registrado` | Payload do evento deve ser estável |
| F06 (Estorno) — downstream | Domain method | `Pagamento.estornar()` preparado mas não exposto via API | Apenas o domain method, sem endpoint |
| GlobalExceptionHandler | Extensão | Novos exception handlers (409, 422) | Estender sem quebrar |
| Outbox | Reutilização | Usa OutboxEventWriter existente | Sem modificação |

---

## Abordagem de Testes

### Testes Unitários

**Domain:**
- `UdaValorTest` — `criar()` com valor válido, valor <= 0 (throws), null checks
- `PagamentoTest` — `registrar()` com dados válidos (verifica cálculo valorBruto), quantidadeUdas <= 0 (throws), verifica período auto-preenchido, verifica snapshot imutável, `estornar()` de CONFIRMADO, `estornar()` de ESTORNADO (throws)

**Application (mock repositories):**
- `AjustarUdaCommandHandlerTest` — happy path, valor inválido
- `RegistrarPagamentoCommandHandlerTest` — happy path (verifica cálculo e evento Outbox), licença não encontrada (404), licença ENCERRADA (422), sem UDA vigente (422), pagamento duplicado (409)
- `ListarPagamentosQueryHandlerTest` — filtros, paginação

### Testes de Integração

**PagamentoPersistenceIntegrationTest:** Flyway V1-V8, seed UDA R$ 107.31, CRUD pagamento, partial unique constraint, Specification filters

**UdaEndpointsIntegrationTest:** GET /uda/vigente (200, 404), POST /uda (201, 400, 403), GET /uda/historico (200)

**PagamentoEndpointsIntegrationTest:** POST /pagamentos (201, 404, 409, 422 encerrada, 422 sem UDA), GET /pagamentos (filtros), GET /pagamentos/{id} (200, 404), segurança (consultor 403)

---

## Sequenciamento de Desenvolvimento

1. **Migration V7 + V8** — tabelas + seed UDA
2. **Domain Layer** — Enum, Entities (UdaValor, Pagamento), Exceptions, Interfaces
3. **Infrastructure** — Repositories (4 classes)
4. **Commands + Handlers** — AjustarUda, RegistrarPagamento (com Outbox)
5. **Queries + DTOs + Specification** — 4 queries + handlers + PagamentoSpecification
6. **API Layer** — UdaController + PagamentoController + GlobalExceptionHandler update
7. **Testes Unitários** — Domain + Application
8. **Testes de Integração** — Persistence + Endpoints (UDA + Pagamento)

### Dependências Técnicas

- F01, F02, F03 implementados (tabelas e repositories existem)
- CQRS foundation e Outbox Pattern do F01/F02
- GlobalExceptionHandler com handlers base do F02

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| `BigDecimal` com `precision=18, scale=6` | Alta precisão para cálculos monetários (RN-06) |
| Valores como `String` no JSON (response) | Evita perda de precisão em JavaScript/JSON |
| Período = `YearMonth.now().toString()` | Garante formato YYYY-MM, não depende de input |
| Partial unique index `WHERE status = 'CONFIRMADO'` | Permite múltiplos ESTORNADOS mas apenas 1 CONFIRMADO |
| Validação aplicacional + constraint de banco | Double-check: handler verifica antes, banco garante em race condition |
| `Pagamento.estornar()` preparado no domain | F06 usará; evita retrabalho futuro |
| Seed UDA via migration (não ApplicationReadyEvent) | Idempotente, determinístico, sem dependência de startup order |
| Outbox na mesma transação do pagamento | Garantia at-least-once: evento só existe se pagamento persistiu |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Cálculo BigDecimal com arredondamento | Usar `RoundingMode.HALF_UP` e definir scale=6 em todas as operações |
| Race condition em unicidade | Partial unique index no banco como safety net |
| UDA vigente muda entre preview do frontend e registro | Backend usa valor vigente no momento do save, não do preview |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
