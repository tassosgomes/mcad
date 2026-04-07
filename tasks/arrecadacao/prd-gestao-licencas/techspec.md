# Tech Spec — F03: Gestão de Licenças (Backend)

> **PRD:** `tasks/arrecadacao/prd-gestao-licencas/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-gestao-licencas/api-contract.yaml`
> **Data:** 2026-04-05

---

## Resumo Executivo

Segunda feature CRUD do serviço `arrecadacao-api`. Implementa licenças com ciclo de vida de 3 estados (ATIVA → SUSPENSA ↔ ATIVA, SUSPENSA → ENCERRADA), vigência flexível (dataFim nullable), e histórico de transições com justificativa. Reutiliza toda a infraestrutura CQRS, Repository Pattern e Exception Handling estabelecida na F02, adicionando novas entidades (Licenca, HistoricoStatusLicenca), enum (StatusLicenca), Commands/Queries e Specification com filtro `vigente`.

A feature consulta Usuário de Música (F02) para validar status ATIVO na criação e Rubrica (F01) para validar existência. Ambas são consultas locais no mesmo schema — sem chamadas HTTP cross-service.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | CQRS, Repository Pattern, domain methods com guards |
| `java-dependency-config` | Spring Data JPA, Specification, Flyway |
| `java-code-quality` | Enum, records para DTOs, domain methods retornam historico |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers PostgreSQL |
| `common-restful-api` | Paginação, sort `-` prefix, RFC 7807, filtro `vigente` |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
API Layer (arrecadacao-api)
  └─ LicencaController
       ├─ GET    /licencas                    → QueryDispatcher → ListarLicencasQuery
       ├─ POST   /licencas                    → CommandDispatcher → CriarLicencaCommand
       ├─ GET    /licencas/{id}               → QueryDispatcher → BuscarLicencaPorIdQuery
       ├─ POST   /licencas/{id}/suspender     → CommandDispatcher → SuspenderLicencaCommand
       ├─ POST   /licencas/{id}/reativar      → CommandDispatcher → ReativarLicencaCommand
       ├─ POST   /licencas/{id}/encerrar      → CommandDispatcher → EncerrarLicencaCommand
       └─ GET    /licencas/{id}/historico-status → QueryDispatcher → ListarHistoricoStatusLicencaQuery

Application Layer (arrecadacao-application)
  ├─ Commands: Criar, Suspender, Reativar, Encerrar
  ├─ Queries: Listar (paginado), BuscarPorId, ListarHistoricoStatus
  ├─ Handlers: um por Command/Query
  ├─ DTOs: Request/Response records
  └─ Specification: LicencaSpecification (5 filtros incluindo vigente)

Domain Layer (arrecadacao-domain)
  ├─ Entities: Licenca, HistoricoStatusLicenca
  ├─ Enums: StatusLicenca (ATIVA, SUSPENSA, ENCERRADA)
  └─ Interfaces: LicencaRepository, HistoricoStatusLicencaRepository

Infrastructure Layer (arrecadacao-infra)
  ├─ Repositories: Jpa + SpringData para Licenca e HistoricoStatusLicenca
  └─ Migrations: V5, V6
```

---

## Design de Implementação

### Domain Layer

#### Enum: StatusLicenca

```java
public enum StatusLicenca {
    ATIVA, SUSPENSA, ENCERRADA
}
```

#### Entity: Licenca

```java
@Entity
@Table(name = "licencas", schema = "arrecadacao")
public class Licenca {
    @Id
    private UUID id;

    @Column(name = "usuario_musica_id", nullable = false)
    private UUID usuarioMusicaId;

    @Column(name = "rubrica_id", nullable = false)
    private UUID rubricaId;

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim")
    private LocalDate dataFim;  // nullable = vigência indefinida

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 15, nullable = false)
    private StatusLicenca status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Licenca() {}

    // Factory method
    public static Licenca criar(UUID usuarioMusicaId, UUID rubricaId,
                                 LocalDate dataInicio, LocalDate dataFim) {
        // Validates: dataInicio != null, dataInicio >= LocalDate.now()
        // Validates: dataFim == null || dataFim.isAfter(dataInicio)
        // Sets: id = UUID.randomUUID(), status = ATIVA, criadoEm/atualizadoEm = Instant.now()
    }

    public HistoricoStatusLicenca suspender(String justificativa, String autor) {
        // Guard: status must be ATIVA
        // Throws IllegalStateException if not ATIVA
        // Sets: status = SUSPENSA, atualizadoEm = now
        // Returns: HistoricoStatusLicenca.criar(id, ATIVA, SUSPENSA, justificativa, autor)
    }

    public HistoricoStatusLicenca reativar(String justificativa, String autor) {
        // Guard: status must be SUSPENSA
        // Throws IllegalStateException if not SUSPENSA
        // Sets: status = ATIVA, atualizadoEm = now
        // Returns: HistoricoStatusLicenca.criar(id, SUSPENSA, ATIVA, justificativa, autor)
    }

    public HistoricoStatusLicenca encerrar(String justificativa, String autor) {
        // Guard: status must be SUSPENSA (NOT ATIVA — must suspend first)
        // Throws IllegalStateException if ATIVA: "Licença deve ser suspensa antes de ser encerrada"
        // Throws IllegalStateException if ENCERRADA: "Licença já está encerrada"
        // Sets: status = ENCERRADA, atualizadoEm = now
        // Returns: HistoricoStatusLicenca.criar(id, SUSPENSA, ENCERRADA, justificativa, autor)
    }

    // Getters only (no setters). usuarioMusicaId and rubricaId are immutable.
}
```

**Decisão: vigência com `LocalDate` (não `Instant`)** — dataInicio e dataFim representam dias de vigência, não momentos. Consistente com o api-contract (`format: date`).

#### Entity: HistoricoStatusLicenca

```java
@Entity
@Table(name = "historico_status_licenca", schema = "arrecadacao")
public class HistoricoStatusLicenca {
    @Id
    private UUID id;

    @Column(name = "licenca_id", nullable = false)
    private UUID licencaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 15)
    private StatusLicenca statusAnterior;  // null on creation

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", length = 15, nullable = false)
    private StatusLicenca statusNovo;

    @Column(name = "justificativa", length = 500, nullable = false)
    private String justificativa;

    @Column(name = "autor", length = 100, nullable = false)
    private String autor;

    @Column(name = "data", nullable = false)
    private Instant data;

    protected HistoricoStatusLicenca() {}

    public static HistoricoStatusLicenca criar(UUID licencaId,
            StatusLicenca statusAnterior, StatusLicenca statusNovo,
            String justificativa, String autor) {
        // Validates: justificativa != null && length >= 10
        // Sets: id = UUID.randomUUID(), data = Instant.now()
    }
}
```

#### Repository Interfaces

```java
public interface LicencaRepository {
    Licenca save(Licenca entity);
    Optional<Licenca> findById(UUID id);
    Page<Licenca> findAll(Specification<Licenca> spec, Pageable pageable);
}

public interface HistoricoStatusLicencaRepository {
    HistoricoStatusLicenca save(HistoricoStatusLicenca entity);
    List<HistoricoStatusLicenca> findByLicencaIdOrderByDataDesc(UUID licencaId);
}
```

### Application Layer

#### Commands

```java
public record CriarLicencaCommand(
    UUID usuarioMusicaId, UUID rubricaId,
    LocalDate dataInicio, LocalDate dataFim, String autor
) implements Command<LicencaResponse> {}

public record SuspenderLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}

public record ReativarLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}

public record EncerrarLicencaCommand(
    UUID id, String justificativa, String autor
) implements Command<LicencaResponse> {}
```

#### Queries

```java
public record ListarLicencasQuery(
    int page, int size, String sort,
    UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
    StatusLicenca status, Boolean vigente
) implements Query<PageResponse<LicencaResponse>> {}

public record BuscarLicencaPorIdQuery(UUID id) implements Query<LicencaResponse> {}

public record ListarHistoricoStatusLicencaQuery(UUID licencaId)
    implements Query<List<HistoricoStatusLicencaResponse>> {}
```

#### Command Handlers

**CriarLicencaCommandHandler:**
1. `usuarioMusicaRepository.findById(cmd.usuarioMusicaId())` → 404 se não encontrado
2. Validar `usuarioMusica.getStatus() == ATIVO` → 422 se INATIVO
3. `rubricaRepository.findBySiglaOrId(cmd.rubricaId())` → 404 se não encontrada (usando findById na rubrica)
4. `Licenca.criar(usuarioMusicaId, rubricaId, dataInicio, dataFim)` — domain valida datas
5. `licencaRepository.save(licenca)`
6. Criar `HistoricoStatusLicenca` inicial (statusAnterior=null, statusNovo=ATIVA, justificativa="Licença criada")
7. `historicoRepository.save(historico)`
8. Mapear para `LicencaResponse` com Usuário e Rubrica expandidos

**SuspenderLicencaCommandHandler / ReativarLicencaCommandHandler / EncerrarLicencaCommandHandler:**
1. `licencaRepository.findById(id)` → 404
2. `licenca.suspender/reativar/encerrar(justificativa, autor)` → domain method com guards (throws se transição inválida)
3. `licencaRepository.save(licenca)` + `historicoRepository.save(historico)`
4. Mapear para `LicencaResponse`

**Nota:** Para mapear `LicencaResponse` com dados expandidos, o handler consulta `UsuarioMusicaRepository.findById()` e `RubricaRepository.findById()` para obter razaoSocial, cnpjFormatado, sigla, nome. Alternativa: join via JPA `@ManyToOne` lazy. **Decisão: consulta explícita** — mantém entidades desacopladas e evita problemas de lazy loading.

#### Specification: LicencaSpecification

```java
public class LicencaSpecification {
    public static Specification<Licenca> comFiltros(
            UUID usuarioMusicaId, String razaoSocial, String rubricaSigla,
            StatusLicenca status, Boolean vigente) {
        return Specification.where(usuarioMusicaIdIgual(usuarioMusicaId))
                .and(razaoSocialContem(razaoSocial))
                .and(rubricaSiglaContem(rubricaSigla))
                .and(statusIgual(status))
                .and(vigente(vigente));
    }

    // usuarioMusicaId: exact match
    // razaoSocial: join to UsuarioMusica, LOWER LIKE (requires subquery or join)
    // rubricaSigla: join to Rubrica, LOWER LIKE
    // status: exact match
    // vigente: true → (dataFim IS NULL OR dataFim >= CURRENT_DATE)
    //          false → (dataFim IS NOT NULL AND dataFim < CURRENT_DATE)
}
```

**Nota sobre filtros razaoSocial e rubricaSigla:** Licenca armazena apenas IDs (usuarioMusicaId, rubricaId). Para filtrar por razaoSocial ou rubricaSigla, a Specification precisa fazer join com as tabelas `usuarios_musica` e `rubricas`. Duas opções:

- **Opção A:** JPA `@ManyToOne` na entidade Licenca → join natural via Specification
- **Opção B:** Subquery no Specification

**Decisão: Opção A com `@ManyToOne(fetch = LAZY)`** — simplifica enormemente a Specification e o mapeamento para DTOs. Os relacionamentos são somente leitura (Licenca nunca modifica Usuário ou Rubrica).

```java
// Na entidade Licenca, adicionar:
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "usuario_musica_id", insertable = false, updatable = false)
private UsuarioMusica usuarioMusica;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "rubrica_id", insertable = false, updatable = false)
private Rubrica rubrica;
```

Isso permite no Specification:
```java
private static Specification<Licenca> razaoSocialContem(String valor) {
    if (valor == null || valor.isBlank()) return null;
    return (root, query, cb) ->
        cb.like(cb.lower(root.get("usuarioMusica").get("razaoSocial")),
                "%" + valor.toLowerCase() + "%");
}
```

#### DTOs

```java
// Response
public record LicencaResponse(
    UUID id,
    UsuarioMusicaResumoResponse usuarioMusica,
    RubricaResumoResponse rubrica,
    LocalDate dataInicio, LocalDate dataFim,
    String status,
    Instant criadoEm, Instant atualizadoEm
) {}

public record UsuarioMusicaResumoResponse(
    UUID id, String razaoSocial, String cnpjFormatado
) {}

public record RubricaResumoResponse(
    UUID id, String sigla, String nome
) {}

public record HistoricoStatusLicencaResponse(
    UUID id, String statusAnterior, String statusNovo,
    String justificativa, String autor, Instant data
) {}

// Requests
public record CriarLicencaRequest(
    @NotNull UUID usuarioMusicaId,
    @NotNull UUID rubricaId,
    @NotNull LocalDate dataInicio,
    LocalDate dataFim  // nullable
) {}

public record TransicaoStatusRequest(
    @NotBlank @Size(min = 10, max = 500) String justificativa
) {}
```

### Modelos de Dados (Flyway Migrations)

#### V5__create_licencas.sql

```sql
CREATE TABLE arrecadacao.licencas (
    id                UUID        PRIMARY KEY,
    usuario_musica_id UUID        NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    rubrica_id        UUID        NOT NULL REFERENCES arrecadacao.rubricas(id),
    data_inicio       DATE        NOT NULL,
    data_fim          DATE,
    status            VARCHAR(15) NOT NULL DEFAULT 'ATIVA',
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_licencas_status CHECK (status IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_licencas_usuario_musica_id ON arrecadacao.licencas (usuario_musica_id);
CREATE INDEX ix_licencas_rubrica_id ON arrecadacao.licencas (rubrica_id);
CREATE INDEX ix_licencas_status ON arrecadacao.licencas (status);
CREATE INDEX ix_licencas_data_inicio ON arrecadacao.licencas (data_inicio DESC);
CREATE INDEX ix_licencas_vigente ON arrecadacao.licencas (data_fim)
    WHERE data_fim IS NOT NULL;
```

#### V6__create_historico_status_licenca.sql

```sql
CREATE TABLE arrecadacao.historico_status_licenca (
    id              UUID         PRIMARY KEY,
    licenca_id      UUID         NOT NULL REFERENCES arrecadacao.licencas(id),
    status_anterior VARCHAR(15),
    status_novo     VARCHAR(15)  NOT NULL,
    justificativa   VARCHAR(500) NOT NULL,
    autor           VARCHAR(100) NOT NULL,
    data            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hist_licenca_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVA', 'SUSPENSA', 'ENCERRADA')),
    CONSTRAINT chk_hist_licenca_novo CHECK (status_novo IN ('ATIVA', 'SUSPENSA', 'ENCERRADA'))
);

CREATE INDEX ix_historico_status_licenca_fk
    ON arrecadacao.historico_status_licenca (licenca_id, data DESC);
```

### API Layer

#### Controller: LicencaController

```java
@RestController
@RequestMapping("/api/v1/licencas")
@Tag(name = "Licenças")
public class LicencaController {
    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    // GET  /licencas                         — listar com filtros
    // POST /licencas                         — criar (@PreAuthorize analista)
    // GET  /licencas/{id}                    — buscar por ID
    // POST /licencas/{id}/suspender          — suspender (@PreAuthorize analista)
    // POST /licencas/{id}/reativar           — reativar (@PreAuthorize analista)
    // POST /licencas/{id}/encerrar           — encerrar (@PreAuthorize analista)
    // GET  /licencas/{id}/historico-status    — listar histórico
}
```

Endpoints de escrita com `@PreAuthorize("hasRole('analista-arrecadacao')")`. Autor extraído do JWT (`preferred_username`, fallback `sub`). Padrão idêntico ao F02.

### Endpoints de API

| Método | Path | Auth | operationId |
|--------|------|------|-------------|
| `GET` | `/api/v1/licencas` | JWT Bearer | `listarLicencas` |
| `POST` | `/api/v1/licencas` | JWT (Analista) | `criarLicenca` |
| `GET` | `/api/v1/licencas/{id}` | JWT Bearer | `buscarLicencaPorId` |
| `POST` | `/api/v1/licencas/{id}/suspender` | JWT (Analista) | `suspenderLicenca` |
| `POST` | `/api/v1/licencas/{id}/reativar` | JWT (Analista) | `reativarLicenca` |
| `POST` | `/api/v1/licencas/{id}/encerrar` | JWT (Analista) | `encerrarLicenca` |
| `GET` | `/api/v1/licencas/{id}/historico-status` | JWT Bearer | `listarHistoricoStatusLicenca` |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `arrecadacao-domain/.../domain/enums/StatusLicenca.java` | Enum | ATIVA, SUSPENSA, ENCERRADA |
| `arrecadacao-domain/.../domain/entities/Licenca.java` | Entity | Entidade com factory + domain methods (suspender, reativar, encerrar) |
| `arrecadacao-domain/.../domain/entities/HistoricoStatusLicenca.java` | Entity | Registro de transição |
| `arrecadacao-domain/.../domain/interfaces/LicencaRepository.java` | Interface | Contrato repositório |
| `arrecadacao-domain/.../domain/interfaces/HistoricoStatusLicencaRepository.java` | Interface | Contrato repositório histórico |
| `arrecadacao-infra/.../resources/db/migration/V5__create_licencas.sql` | Migration | Tabela + índices |
| `arrecadacao-infra/.../resources/db/migration/V6__create_historico_status_licenca.sql` | Migration | Tabela histórico |
| `arrecadacao-infra/.../infra/persistence/SpringDataLicencaRepository.java` | Repository | Spring Data + JpaSpecificationExecutor |
| `arrecadacao-infra/.../infra/persistence/JpaLicencaRepository.java` | Repository | Adapter implementando LicencaRepository |
| `arrecadacao-infra/.../infra/persistence/SpringDataHistoricoStatusLicencaRepository.java` | Repository | Spring Data |
| `arrecadacao-infra/.../infra/persistence/JpaHistoricoStatusLicencaRepository.java` | Repository | Adapter |
| `arrecadacao-application/.../application/commands/CriarLicencaCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/SuspenderLicencaCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/ReativarLicencaCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/EncerrarLicencaCommand.java` | Command | Record |
| `arrecadacao-application/.../application/commands/handlers/CriarLicencaCommandHandler.java` | Handler | Valida Usuário ATIVO + Rubrica, cria entidade + histórico |
| `arrecadacao-application/.../application/commands/handlers/SuspenderLicencaCommandHandler.java` | Handler | ATIVA → SUSPENSA |
| `arrecadacao-application/.../application/commands/handlers/ReativarLicencaCommandHandler.java` | Handler | SUSPENSA → ATIVA |
| `arrecadacao-application/.../application/commands/handlers/EncerrarLicencaCommandHandler.java` | Handler | SUSPENSA → ENCERRADA |
| `arrecadacao-application/.../application/queries/ListarLicencasQuery.java` | Query | Record com filtros |
| `arrecadacao-application/.../application/queries/BuscarLicencaPorIdQuery.java` | Query | Record |
| `arrecadacao-application/.../application/queries/ListarHistoricoStatusLicencaQuery.java` | Query | Record |
| `arrecadacao-application/.../application/queries/handlers/ListarLicencasQueryHandler.java` | Handler | Specification + Pageable |
| `arrecadacao-application/.../application/queries/handlers/BuscarLicencaPorIdQueryHandler.java` | Handler | FindById com expansão |
| `arrecadacao-application/.../application/queries/handlers/ListarHistoricoStatusLicencaQueryHandler.java` | Handler | FindByLicencaId |
| `arrecadacao-application/.../application/specification/LicencaSpecification.java` | Specification | 5 filtros (incluindo vigente) |
| `arrecadacao-application/.../application/dto/LicencaResponse.java` | DTO | Response com expansão |
| `arrecadacao-application/.../application/dto/UsuarioMusicaResumoResponse.java` | DTO | Sub-response |
| `arrecadacao-application/.../application/dto/RubricaResumoResponse.java` | DTO | Sub-response |
| `arrecadacao-application/.../application/dto/HistoricoStatusLicencaResponse.java` | DTO | Response |
| `arrecadacao-application/.../application/dto/CriarLicencaRequest.java` | DTO | Request com Bean Validation |
| `arrecadacao-application/.../application/dto/TransicaoStatusRequest.java` | DTO | Request justificativa |
| `arrecadacao-api/.../api/controllers/LicencaController.java` | Controller | 7 endpoints REST |
| `arrecadacao-domain/src/test/.../domain/entities/LicencaTest.java` | Teste | Unitário: factory, guards, transitions |
| `arrecadacao-domain/src/test/.../domain/entities/HistoricoStatusLicencaTest.java` | Teste | Unitário: factory, validação |
| `arrecadacao-application/src/test/.../commands/handlers/CriarLicencaCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../commands/handlers/SuspenderLicencaCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../commands/handlers/ReativarLicencaCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../commands/handlers/EncerrarLicencaCommandHandlerTest.java` | Teste | Unitário |
| `arrecadacao-application/src/test/.../queries/handlers/ListarLicencasQueryHandlerTest.java` | Teste | Unitário: filtros, vigente |
| `arrecadacao-tests/src/test/.../infra/persistence/LicencaPersistenceIntegrationTest.java` | Teste | Integração: Testcontainers |
| `arrecadacao-tests/src/test/.../api/LicencaEndpointsIntegrationTest.java` | Teste | Integração: 7 endpoints HTTP |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| Nenhum | F02 já estabeleceu GlobalExceptionHandler, CorsConfig, SecurityConfig e CQRS foundation |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `arrecadacao-domain/.../domain/entities/UsuarioMusica.java` | Consulta status ATIVO na criação |
| `arrecadacao-domain/.../domain/entities/Rubrica.java` | Consulta existência na criação |
| `arrecadacao-domain/.../domain/valueobjects/Cnpj.java` | Padrão VO para cnpjFormatado no response |
| `arrecadacao-domain/.../domain/interfaces/UsuarioMusicaRepository.java` | Consulta na CriarLicencaCommandHandler |
| `arrecadacao-domain/.../domain/interfaces/RubricaRepository.java` | Consulta na CriarLicencaCommandHandler |
| `arrecadacao-application/.../application/cqrs/*.java` | CQRS foundation reutilizada |
| `arrecadacao-application/.../application/dto/PageResponse.java` | DTO paginação reutilizado |
| `arrecadacao-api/.../api/config/GlobalExceptionHandler.java` | Exception handlers reutilizados |
| `arrecadacao-tests/.../RubricaPersistenceIntegrationTest.java` | Padrão Testcontainers |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|--------------------|-----------------|-------------------|----------------|
| Schema `arrecadacao` | Novas tabelas | 2 tabelas + índices. Sem impacto em existentes | Migration V5 + V6 |
| F02 (UsuarioMusica) | Dependência leitura | CriarLicencaHandler consulta UsuarioMusica por ID | Garantir que F02 está implementado antes |
| F01 (Rubricas) | Dependência leitura | CriarLicencaHandler consulta Rubrica por ID | Rubrica já existe desde F01 |
| F04 (Pagamentos) — downstream | Dependência futura | F04 selecionará licenças ATIVAS/SUSPENSAS | Endpoint GET /licencas com filtro status disponível |
| F05 (Verba) — downstream | Lock validation | F05 verificará verba antes de permitir pagamento | Licença independente de verba — sem impacto |

---

## Abordagem de Testes

### Testes Unitários (JUnit 5 + AssertJ + Mockito)

**Domain Layer:**
- `LicencaTest` — `criar()` com datas válidas, dataInicio no passado (rejeita), dataFim < dataInicio (rejeita), `suspender()` de ATIVA (ok), `suspender()` de SUSPENSA (throws), `reativar()` de SUSPENSA (ok), `reativar()` de ATIVA (throws), `encerrar()` de SUSPENSA (ok), `encerrar()` de ATIVA (throws — "deve suspender antes"), `encerrar()` de ENCERRADA (throws)
- `HistoricoStatusLicencaTest` — `criar()` ok, justificativa < 10 chars (throws)

**Application Layer (mock repositories):**
- `CriarLicencaCommandHandlerTest` — happy path, Usuário INATIVO (422), Usuário não encontrado (404), Rubrica não encontrada (404), dataInicio passado (422)
- `SuspenderLicencaCommandHandlerTest` — happy path, not found (404), já suspensa (422)
- `ReativarLicencaCommandHandlerTest` — happy path, not found (404), já ativa (422)
- `EncerrarLicencaCommandHandlerTest` — happy path, not found (404), ATIVA diretamente (422), já encerrada (422)
- `ListarLicencasQueryHandlerTest` — sem filtro, com filtros, filtro vigente=true/false

### Testes de Integração (Spring Boot Test + Testcontainers)

**LicencaPersistenceIntegrationTest:** Flyway count (V1-V6), CRUD, FK constraints, Specification com filtro vigente

**LicencaEndpointsIntegrationTest:** 7 endpoints happy path + cenários de erro (400, 404, 422), Usuário INATIVO, transições inválidas, segurança (consultor 403)

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Migration (V5 + V6)** — tabelas e índices
2. **Domain Layer** — Enum, Entities, Interfaces
3. **Infrastructure** — Repositories JPA + Spring Data
4. **Commands** — 4 commands + handlers (inclui validação de Usuário ATIVO)
5. **Queries + DTOs + Specification** — 3 queries + handlers + filtro vigente
6. **API Layer** — Controller (7 endpoints)
7. **Testes Unitários** — Domain + Application
8. **Testes de Integração** — Persistence + Endpoints

### Dependências Técnicas

- F01 e F02 implementados (tabelas `rubricas` e `usuarios_musica` existem, repositories disponíveis)
- CQRS foundation (Query/Command interfaces, Dispatchers) do F02
- GlobalExceptionHandler com handlers de erro do F02

---

## Monitoramento e Observabilidade

- **Logs:** INFO: criação de licença (usuarioMusicaId, rubricaId), transição de status (id, de→para). WARN: Usuário INATIVO, transição inválida
- **Health Check:** `/actuator/health` (já configurado)
- **Métricas:** Spring Boot Actuator default

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| `@ManyToOne(fetch = LAZY, insertable = false, updatable = false)` para UsuarioMusica e Rubrica | Simplifica Specification e mapeamento DTOs; somente leitura; evita problemas de ownership |
| `LocalDate` para vigência (não `Instant`) | Vigência é conceito de dias, não de horas |
| Domain methods retornam HistoricoStatusLicenca | Entity controla próprio ciclo de vida; handler apenas persiste |
| `encerrar()` rejeita ATIVA diretamente | Regra de negócio explícita no PRD — guard no domain method |
| Sem `@ManyToOne` bidirecional (Licenca não tem `@OneToMany` historico) | Historico cresce indefinidamente; consulta via repository separado |
| Consulta de Usuário/Rubrica no handler (não no domain) | Domain não conhece repositories; handler orquestra |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Lazy loading de UsuarioMusica/Rubrica fora de transaction | `@Transactional` no handler garante sessão aberta; Specification faz join implícito |
| Filtro `vigente` com performance ruim | Índice parcial `ix_licencas_vigente` em dataFim WHERE NOT NULL |
| Race condition em transições de status concorrentes | Pessimistic lock via `@Lock(LockModeType.PESSIMISTIC_WRITE)` no findById se necessário (PoC: aceitável sem lock) |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
