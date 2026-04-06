# Tech Spec — F02: Gestão de Usuários de Música (Backend)

> **PRD:** `tasks/arrecadacao/prd-gestao-usuarios-musica/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-gestao-usuarios-musica/api-contract.yaml`
> **Data:** 2026-04-05

---

## Resumo Executivo

Primeira feature CRUD completa do serviço `arrecadacao-api`. Introduz o padrão para entidades com ciclo de status (ATIVO/INATIVO + histórico com justificativa), Value Objects (Cnpj), Embeddables (Endereco, Contato), CQRS com Commands + Queries, e filtros server-side via Spring Data Specification. A fundação estabelecida em F01 (Outbox, Flyway, segurança, multi-module) é estendida com REST controllers, DTOs, validações e testes.

O Cnpj Value Object implementa o algoritmo módulo 11 com suporte ao novo formato alfanumérico da RFB, seguindo como referência a implementação do Cadastro API (`Cadastro.Domain.ValueObjects.Cnpj`).

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | Clean Architecture multi-module, CQRS type-safe, Repository Pattern |
| `java-dependency-config` | Spring Data JPA, Flyway, MapStruct, Spring Validation |
| `java-code-quality` | Naming PascalCase/camelCase, records para DTOs, Value Objects imutáveis |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers PostgreSQL |
| `common-restful-api` | Paginação page/size, sort com `-` prefix, RFC 7807 |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
API Layer (arrecadacao-api)
  └─ UsuarioMusicaController
       ├─ GET    /usuarios-musica          → QueryDispatcher → ListarUsuariosMusicaQuery
       ├─ POST   /usuarios-musica          → CommandDispatcher → CriarUsuarioMusicaCommand
       ├─ GET    /usuarios-musica/{id}     → QueryDispatcher → BuscarUsuarioMusicaPorIdQuery
       ├─ PUT    /usuarios-musica/{id}     → CommandDispatcher → AtualizarUsuarioMusicaCommand
       ├─ POST   /usuarios-musica/{id}/inativar  → CommandDispatcher → InativarUsuarioMusicaCommand
       ├─ POST   /usuarios-musica/{id}/ativar    → CommandDispatcher → AtivarUsuarioMusicaCommand
       └─ GET    /usuarios-musica/{id}/historico-status → QueryDispatcher → ListarHistoricoStatusQuery

Application Layer (arrecadacao-application)
  ├─ Commands: Criar, Atualizar, Inativar, Ativar
  ├─ Queries: Listar (paginado), BuscarPorId, ListarHistoricoStatus
  ├─ Handlers: um por Command/Query
  ├─ DTOs: Request/Response records
  └─ Specification: UsuarioMusicaSpecification (filtros dinâmicos)

Domain Layer (arrecadacao-domain)
  ├─ Entities: UsuarioMusica, HistoricoStatusUsuario
  ├─ Value Objects: Cnpj (módulo 11, alfanumérico)
  ├─ Embeddables: Endereco, Contato
  └─ Enums: StatusUsuarioMusica (ATIVO, INATIVO)

Infrastructure Layer (arrecadacao-infra)
  ├─ Repositories: JpaUsuarioMusicaRepository, JpaHistoricoStatusUsuarioRepository
  ├─ Spring Data: SpringDataUsuarioMusicaRepository, SpringDataHistoricoStatusUsuarioRepository
  └─ Migrations: V3, V4
```

---

## Design de Implementação

### Domain Layer

#### Enum: StatusUsuarioMusica

```java
public enum StatusUsuarioMusica {
    ATIVO, INATIVO
}
```

#### Value Object: Cnpj

Referência: `Cadastro.Domain.ValueObjects.Cnpj` (.NET).

```java
@Embeddable
public final class Cnpj {
    @Column(name = "cnpj", length = 14, nullable = false, unique = true)
    private String valor;

    // JPA protected constructor
    protected Cnpj() {}

    private Cnpj(String valor) { this.valor = valor; }

    public static Cnpj criar(String valor) {
        // 1. Strip non-alphanumeric, uppercase
        // 2. Validate length == 14
        // 3. Validate positions 12-13 are digits
        // 4. Módulo 11: weights [5,4,3,2,9,8,7,6,5,4,3,2] for DV1
        // 5. Módulo 11: weights [6,5,4,3,2,9,8,7,6,5,4,3,2] for DV2
        // 6. ASCII-48 conversion for alphanumeric support
        // Throws IllegalArgumentException("CNPJ inválido") on failure
    }

    public String getValor() { return valor; }

    public String getFormatado() {
        // AA.BBB.CCC/DDDD-EE
        return valor.substring(0,2) + "." + valor.substring(2,5) + "." +
               valor.substring(5,8) + "/" + valor.substring(8,12) + "-" +
               valor.substring(12,14);
    }

    // equals/hashCode based on valor
}
```

**Algoritmo módulo 11 (conversão alfanumérica):**
- Caractere → valor numérico: `char - 48` (dígitos '0'-'9' → 0-9; letras 'A'-'Z' → 17-42)
- Soma ponderada com pesos
- Resto = soma % 11; DV = resto < 2 ? 0 : 11 - resto
- Posições 12-13 (DVs) sempre dígitos numéricos

#### Embeddable: Endereco

```java
@Embeddable
public class Endereco {
    @Column(name = "cep", length = 8, nullable = false)
    private String cep;

    @Column(name = "logradouro", length = 200, nullable = false)
    private String logradouro;

    @Column(name = "numero", length = 20, nullable = false)
    private String numero;

    @Column(name = "complemento", length = 100)
    private String complemento;  // nullable

    @Column(name = "bairro", length = 100, nullable = false)
    private String bairro;

    @Column(name = "cidade", length = 100, nullable = false)
    private String cidade;

    @Column(name = "uf", length = 2, nullable = false)
    private String uf;

    protected Endereco() {}
    // All-args constructor, getters only
}
```

#### Embeddable: Contato

```java
@Embeddable
public class Contato {
    @Column(name = "nome_responsavel", length = 200, nullable = false)
    private String nomeResponsavel;

    @Column(name = "telefone", length = 20)
    private String telefone;  // nullable

    @Column(name = "email", length = 200)
    private String email;  // nullable

    protected Contato() {}
    // All-args constructor, getters only
}
```

#### Entity: UsuarioMusica

```java
@Entity
@Table(name = "usuarios_musica", schema = "arrecadacao")
public class UsuarioMusica {
    @Id
    private UUID id;

    @Column(name = "razao_social", length = 200, nullable = false)
    private String razaoSocial;

    @Column(name = "nome_fantasia", length = 200)
    private String nomeFantasia;

    @Embedded
    private Cnpj cnpj;

    @Embedded
    private Endereco endereco;

    @Embedded
    private Contato contato;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 10, nullable = false)
    private StatusUsuarioMusica status;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected UsuarioMusica() {}

    // Factory method
    public static UsuarioMusica criar(String razaoSocial, String nomeFantasia,
                                       Cnpj cnpj, Endereco endereco, Contato contato) {
        // Validates razaoSocial >= 3 chars
        // Sets id = UUID.randomUUID(), status = ATIVO, criadoEm/atualizadoEm = now
    }

    // Domain methods
    public void atualizar(String razaoSocial, String nomeFantasia,
                          Endereco endereco, Contato contato) {
        // Updates mutable fields, sets atualizadoEm = now
        // CNPJ and status NOT changed here
    }

    public HistoricoStatusUsuario inativar(String justificativa, String autor) {
        // Guard: status must be ATIVO
        // Throws IllegalStateException if already INATIVO
        // Sets status = INATIVO, atualizadoEm = now
        // Returns new HistoricoStatusUsuario record
    }

    public HistoricoStatusUsuario ativar(String justificativa, String autor) {
        // Guard: status must be INATIVO
        // Throws IllegalStateException if already ATIVO
        // Sets status = ATIVO, atualizadoEm = now
        // Returns new HistoricoStatusUsuario record
    }

    // Getters only (no setters)
}
```

#### Entity: HistoricoStatusUsuario

```java
@Entity
@Table(name = "historico_status_usuario", schema = "arrecadacao")
public class HistoricoStatusUsuario {
    @Id
    private UUID id;

    @Column(name = "usuario_musica_id", nullable = false)
    private UUID usuarioMusicaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status_anterior", length = 10)
    private StatusUsuarioMusica statusAnterior;  // null on initial creation

    @Enumerated(EnumType.STRING)
    @Column(name = "status_novo", length = 10, nullable = false)
    private StatusUsuarioMusica statusNovo;

    @Column(name = "justificativa", length = 500, nullable = false)
    private String justificativa;

    @Column(name = "autor", length = 100, nullable = false)
    private String autor;

    @Column(name = "data", nullable = false)
    private Instant data;

    protected HistoricoStatusUsuario() {}

    public static HistoricoStatusUsuario criar(UUID usuarioMusicaId,
            StatusUsuarioMusica statusAnterior, StatusUsuarioMusica statusNovo,
            String justificativa, String autor) {
        // Validates justificativa >= 10 chars
        // Sets id = UUID.randomUUID(), data = now
    }
}
```

### Application Layer

#### CQRS Foundation (Shared — introduzido nesta feature)

```java
// Query marker
public interface Query<R> {}

// Command marker
public interface Command<R> {}

// Handler interfaces
public interface QueryHandler<Q extends Query<R>, R> { R handle(Q query); }
public interface CommandHandler<C extends Command<R>, R> { R handle(C command); }

// Dispatchers
@Component
public class QueryDispatcher {
    // Registry of handlers, dispatch by query type
}

@Component
public class CommandDispatcher {
    // Registry of handlers, dispatch by command type
}
```

> **Nota:** Se F01 já introduziu `Query`/`QueryHandler`/`QueryDispatcher`, reutilizar. Esta feature adiciona `Command`/`CommandHandler`/`CommandDispatcher`.

#### Commands

```java
// Criar
public record CriarUsuarioMusicaCommand(
    String razaoSocial, String nomeFantasia, String cnpj,
    EnderecoRequest endereco, ContatoRequest contato
) implements Command<UsuarioMusicaResponse> {}

// Atualizar
public record AtualizarUsuarioMusicaCommand(
    UUID id, String razaoSocial, String nomeFantasia,
    EnderecoRequest endereco, ContatoRequest contato
) implements Command<UsuarioMusicaResponse> {}

// Inativar
public record InativarUsuarioMusicaCommand(
    UUID id, String justificativa, String autor
) implements Command<UsuarioMusicaResponse> {}

// Ativar
public record AtivarUsuarioMusicaCommand(
    UUID id, String justificativa, String autor
) implements Command<UsuarioMusicaResponse> {}
```

#### Queries

```java
// Listar (paginado com filtros)
public record ListarUsuariosMusicaQuery(
    int page, int size, String sort,
    String razaoSocial, String cnpj,
    StatusUsuarioMusica status, String cidade
) implements Query<PageResponse<UsuarioMusicaResponse>> {}

// Buscar por ID
public record BuscarUsuarioMusicaPorIdQuery(
    UUID id
) implements Query<UsuarioMusicaResponse> {}

// Histórico de Status
public record ListarHistoricoStatusQuery(
    UUID usuarioMusicaId
) implements Query<List<HistoricoStatusResponse>> {}
```

#### Handlers

**CriarUsuarioMusicaCommandHandler:**
1. `Cnpj.criar(command.cnpj())` — valida módulo 11
2. Verifica unicidade via `repository.existsByCnpj(cnpj)` → 409 Conflict
3. Cria `Endereco` e `Contato` embeddables
4. `UsuarioMusica.criar(...)` → entidade com status ATIVO
5. Cria `HistoricoStatusUsuario` inicial (statusAnterior=null, statusNovo=ATIVO, justificativa="Cadastro inicial")
6. `repository.save(entity)` + `historicoRepository.save(historico)`
7. Mapeia para `UsuarioMusicaResponse`

**AtualizarUsuarioMusicaCommandHandler:**
1. `repository.findById(id)` → 404 se não encontrado
2. `entity.atualizar(...)` — CNPJ e status imutáveis
3. `repository.save(entity)`
4. Mapeia para `UsuarioMusicaResponse`

**InativarUsuarioMusicaCommandHandler:**
1. `repository.findById(id)` → 404
2. `entity.inativar(justificativa, autor)` → retorna HistoricoStatusUsuario (ou throws se já INATIVO)
3. `repository.save(entity)` + `historicoRepository.save(historico)`
4. Mapeia para `UsuarioMusicaResponse`

**AtivarUsuarioMusicaCommandHandler:**
1. `repository.findById(id)` → 404
2. `entity.ativar(justificativa, autor)` → retorna HistoricoStatusUsuario (ou throws se já ATIVO)
3. `repository.save(entity)` + `historicoRepository.save(historico)`
4. Mapeia para `UsuarioMusicaResponse`

**ListarUsuariosMusicaQueryHandler:**
1. Constrói `Specification<UsuarioMusica>` via `UsuarioMusicaSpecification`
2. Constrói `Pageable` com sort parsing (prefixo `-` → DESC)
3. `repository.findAll(spec, pageable)` → Page<UsuarioMusica>
4. Mapeia para `PageResponse<UsuarioMusicaResponse>`

**BuscarUsuarioMusicaPorIdQueryHandler:**
1. `repository.findById(id)` → 404
2. Mapeia para `UsuarioMusicaResponse`

**ListarHistoricoStatusQueryHandler:**
1. Verifica se usuário existe → 404
2. `historicoRepository.findByUsuarioMusicaIdOrderByDataDesc(id)`
3. Mapeia para `List<HistoricoStatusResponse>`

#### DTOs (Records)

```java
// Response
public record UsuarioMusicaResponse(
    UUID id, String razaoSocial, String nomeFantasia,
    String cnpj, String cnpjFormatado,
    EnderecoResponse endereco, ContatoResponse contato,
    String status, Instant criadoEm, Instant atualizadoEm
) {}

public record EnderecoResponse(
    String cep, String logradouro, String numero,
    String complemento, String bairro, String cidade, String uf
) {}

public record ContatoResponse(
    String nomeResponsavel, String telefone, String email
) {}

public record HistoricoStatusResponse(
    UUID id, String statusAnterior, String statusNovo,
    String justificativa, String autor, Instant data
) {}

// Pagination wrapper
public record PageResponse<T>(
    List<T> data, PaginationInfo pagination
) {}

public record PaginationInfo(
    int page, int size, long total, int totalPages
) {}

// Request DTOs (used in API layer for deserialization)
public record CriarUsuarioMusicaRequest(
    String razaoSocial, String nomeFantasia, String cnpj,
    EnderecoRequest endereco, ContatoRequest contato
) {}

public record AtualizarUsuarioMusicaRequest(
    String razaoSocial, String nomeFantasia,
    EnderecoRequest endereco, ContatoRequest contato
) {}

public record AlterarStatusRequest(String justificativa) {}

public record EnderecoRequest(
    String cep, String logradouro, String numero,
    String complemento, String bairro, String cidade, String uf
) {}

public record ContatoRequest(
    String nomeResponsavel, String telefone, String email
) {}
```

#### Specification: UsuarioMusicaSpecification

```java
public class UsuarioMusicaSpecification {
    public static Specification<UsuarioMusica> comFiltros(
            String razaoSocial, String cnpj,
            StatusUsuarioMusica status, String cidade) {
        return Specification.where(razaoSocialContem(razaoSocial))
                .and(cnpjContem(cnpj))
                .and(statusIgual(status))
                .and(cidadeContem(cidade));
    }

    // razaoSocial: LOWER(u.razaoSocial) LIKE LOWER('%valor%')
    // cnpj: u.cnpj.valor LIKE '%valor%' (strip non-alphanumeric from input)
    // status: u.status = valor (exact)
    // cidade: LOWER(u.endereco.cidade) LIKE LOWER('%valor%')
    // Each returns null if param is null/blank (Specification.where ignores nulls)
}
```

### API Layer

#### Controller: UsuarioMusicaController

```java
@RestController
@RequestMapping("/api/v1/usuarios-musica")
@Tag(name = "Usuários de Música")
public class UsuarioMusicaController {

    private final CommandDispatcher commandDispatcher;
    private final QueryDispatcher queryDispatcher;

    // GET /api/v1/usuarios-musica
    @GetMapping
    public ResponseEntity<PageResponse<UsuarioMusicaResponse>> listar(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "razaoSocial") String sort,
            @RequestParam(required = false) String razaoSocial,
            @RequestParam(required = false) String cnpj,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cidade) {
        // Parse status to enum if present
        // Dispatch ListarUsuariosMusicaQuery
    }

    // POST /api/v1/usuarios-musica
    @PostMapping
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UsuarioMusicaResponse> criar(
            @Valid @RequestBody CriarUsuarioMusicaRequest request) {
        // Map request to CriarUsuarioMusicaCommand
        // Return 201 with Location header
    }

    // GET /api/v1/usuarios-musica/{id}
    @GetMapping("/{id}")
    public ResponseEntity<UsuarioMusicaResponse> buscarPorId(@PathVariable UUID id) {
        // Dispatch BuscarUsuarioMusicaPorIdQuery
    }

    // PUT /api/v1/usuarios-musica/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UsuarioMusicaResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody AtualizarUsuarioMusicaRequest request) {
        // Map to AtualizarUsuarioMusicaCommand
    }

    // POST /api/v1/usuarios-musica/{id}/inativar
    @PostMapping("/{id}/inativar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UsuarioMusicaResponse> inativar(
            @PathVariable UUID id,
            @Valid @RequestBody AlterarStatusRequest request) {
        // Extract autor from SecurityContextHolder JWT claim preferred_username
        // Map to InativarUsuarioMusicaCommand
    }

    // POST /api/v1/usuarios-musica/{id}/ativar
    @PostMapping("/{id}/ativar")
    @PreAuthorize("hasRole('analista-arrecadacao')")
    public ResponseEntity<UsuarioMusicaResponse> ativar(
            @PathVariable UUID id,
            @Valid @RequestBody AlterarStatusRequest request) {
        // Extract autor from SecurityContextHolder JWT claim preferred_username
        // Map to AtivarUsuarioMusicaCommand
    }

    // GET /api/v1/usuarios-musica/{id}/historico-status
    @GetMapping("/{id}/historico-status")
    public ResponseEntity<List<HistoricoStatusResponse>> listarHistorico(
            @PathVariable UUID id) {
        // Dispatch ListarHistoricoStatusQuery
    }
}
```

#### GlobalExceptionHandler (atualizar)

Adicionar handlers específicos para exceções de domínio:

```java
@ExceptionHandler(IllegalArgumentException.class)
// → 422 Unprocessable Entity (CNPJ inválido, validações de domínio)

@ExceptionHandler(IllegalStateException.class)
// → 422 Unprocessable Entity (já ATIVO/INATIVO)

@ExceptionHandler(EntityNotFoundException.class)
// → 404 Not Found

@ExceptionHandler(CnpjDuplicadoException.class)
// → 409 Conflict

@ExceptionHandler(MethodArgumentNotValidException.class)
// → 400 Bad Request (Bean Validation failures)
```

Todas as respostas de erro em formato RFC 7807 ProblemDetail.

### Modelos de Dados (Flyway Migrations)

#### V3__create_usuarios_musica.sql

```sql
CREATE TABLE arrecadacao.usuarios_musica (
    id                UUID        PRIMARY KEY,
    razao_social      VARCHAR(200) NOT NULL,
    nome_fantasia     VARCHAR(200),
    cnpj              VARCHAR(14)  NOT NULL UNIQUE,
    cep               VARCHAR(8)   NOT NULL,
    logradouro        VARCHAR(200) NOT NULL,
    numero            VARCHAR(20)  NOT NULL,
    complemento       VARCHAR(100),
    bairro            VARCHAR(100) NOT NULL,
    cidade            VARCHAR(100) NOT NULL,
    uf                VARCHAR(2)   NOT NULL,
    nome_responsavel  VARCHAR(200) NOT NULL,
    telefone          VARCHAR(20),
    email             VARCHAR(200),
    status            VARCHAR(10)  NOT NULL DEFAULT 'ATIVO',
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_usuarios_musica_status CHECK (status IN ('ATIVO', 'INATIVO'))
);

-- Índices para filtros da listagem
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX ix_usuarios_musica_razao_social
    ON arrecadacao.usuarios_musica USING gin (razao_social gin_trgm_ops);

CREATE INDEX ix_usuarios_musica_cnpj
    ON arrecadacao.usuarios_musica (cnpj);

CREATE INDEX ix_usuarios_musica_cidade
    ON arrecadacao.usuarios_musica USING gin (cidade gin_trgm_ops);

CREATE INDEX ix_usuarios_musica_status
    ON arrecadacao.usuarios_musica (status);
```

#### V4__create_historico_status_usuario.sql

```sql
CREATE TABLE arrecadacao.historico_status_usuario (
    id                 UUID         PRIMARY KEY,
    usuario_musica_id  UUID         NOT NULL REFERENCES arrecadacao.usuarios_musica(id),
    status_anterior    VARCHAR(10),
    status_novo        VARCHAR(10)  NOT NULL,
    justificativa      VARCHAR(500) NOT NULL,
    autor              VARCHAR(100) NOT NULL,
    data               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_historico_status_anterior CHECK (status_anterior IS NULL OR status_anterior IN ('ATIVO', 'INATIVO')),
    CONSTRAINT chk_historico_status_novo CHECK (status_novo IN ('ATIVO', 'INATIVO'))
);

CREATE INDEX ix_historico_status_usuario_fk
    ON arrecadacao.historico_status_usuario (usuario_musica_id, data DESC);
```

### Endpoints de API

| Método | Path | Auth | operationId |
|--------|------|------|-------------|
| `GET` | `/api/v1/usuarios-musica` | JWT Bearer | `listarUsuariosMusica` |
| `POST` | `/api/v1/usuarios-musica` | JWT (Analista) | `criarUsuarioMusica` |
| `GET` | `/api/v1/usuarios-musica/{id}` | JWT Bearer | `buscarUsuarioMusicaPorId` |
| `PUT` | `/api/v1/usuarios-musica/{id}` | JWT (Analista) | `atualizarUsuarioMusica` |
| `POST` | `/api/v1/usuarios-musica/{id}/inativar` | JWT (Analista) | `inativarUsuarioMusica` |
| `POST` | `/api/v1/usuarios-musica/{id}/ativar` | JWT (Analista) | `ativarUsuarioMusica` |
| `GET` | `/api/v1/usuarios-musica/{id}/historico-status` | JWT Bearer | `listarHistoricoStatusUsuarioMusica` |

Contratos de request/response conforme `api-contract.yaml`.

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `arrecadacao-domain/src/main/java/.../domain/enums/StatusUsuarioMusica.java` | Enum | ATIVO, INATIVO |
| `arrecadacao-domain/src/main/java/.../domain/valueobjects/Cnpj.java` | Value Object | Módulo 11, alfanumérico, @Embeddable |
| `arrecadacao-domain/src/main/java/.../domain/valueobjects/Endereco.java` | Embeddable | Endereço brasileiro completo |
| `arrecadacao-domain/src/main/java/.../domain/valueobjects/Contato.java` | Embeddable | Nome responsável, telefone, email |
| `arrecadacao-domain/src/main/java/.../domain/entities/UsuarioMusica.java` | Entity | Entidade principal com factory + domain methods |
| `arrecadacao-domain/src/main/java/.../domain/entities/HistoricoStatusUsuario.java` | Entity | Registro de transição de status |
| `arrecadacao-domain/src/main/java/.../domain/interfaces/UsuarioMusicaRepository.java` | Interface | Contrato do repositório |
| `arrecadacao-domain/src/main/java/.../domain/interfaces/HistoricoStatusUsuarioRepository.java` | Interface | Contrato do repositório de histórico |
| `arrecadacao-domain/src/main/java/.../domain/exceptions/CnpjDuplicadoException.java` | Exception | 409 Conflict |
| `arrecadacao-domain/src/main/java/.../domain/exceptions/EntidadeNaoEncontradaException.java` | Exception | 404 Not Found |
| `arrecadacao-infra/src/main/resources/db/migration/V3__create_usuarios_musica.sql` | Migration | Tabela + índices (pg_trgm) |
| `arrecadacao-infra/src/main/resources/db/migration/V4__create_historico_status_usuario.sql` | Migration | Tabela de histórico |
| `arrecadacao-infra/src/main/java/.../infra/persistence/JpaUsuarioMusicaRepository.java` | Repository | Implementação JPA do repositório |
| `arrecadacao-infra/src/main/java/.../infra/persistence/SpringDataUsuarioMusicaRepository.java` | Repository | Interface Spring Data |
| `arrecadacao-infra/src/main/java/.../infra/persistence/JpaHistoricoStatusUsuarioRepository.java` | Repository | Implementação JPA do histórico |
| `arrecadacao-infra/src/main/java/.../infra/persistence/SpringDataHistoricoStatusUsuarioRepository.java` | Repository | Interface Spring Data do histórico |
| `arrecadacao-application/src/main/java/.../application/cqrs/Query.java` | Interface | Marker interface para queries |
| `arrecadacao-application/src/main/java/.../application/cqrs/Command.java` | Interface | Marker interface para commands |
| `arrecadacao-application/src/main/java/.../application/cqrs/QueryHandler.java` | Interface | Handler genérico de query |
| `arrecadacao-application/src/main/java/.../application/cqrs/CommandHandler.java` | Interface | Handler genérico de command |
| `arrecadacao-application/src/main/java/.../application/cqrs/QueryDispatcher.java` | Component | Dispatcher de queries |
| `arrecadacao-application/src/main/java/.../application/cqrs/CommandDispatcher.java` | Component | Dispatcher de commands |
| `arrecadacao-application/src/main/java/.../application/dto/UsuarioMusicaResponse.java` | DTO | Response record |
| `arrecadacao-application/src/main/java/.../application/dto/EnderecoResponse.java` | DTO | Response record |
| `arrecadacao-application/src/main/java/.../application/dto/ContatoResponse.java` | DTO | Response record |
| `arrecadacao-application/src/main/java/.../application/dto/HistoricoStatusResponse.java` | DTO | Response record |
| `arrecadacao-application/src/main/java/.../application/dto/PageResponse.java` | DTO | Wrapper paginação genérico |
| `arrecadacao-application/src/main/java/.../application/dto/PaginationInfo.java` | DTO | Metadados de paginação |
| `arrecadacao-application/src/main/java/.../application/dto/CriarUsuarioMusicaRequest.java` | DTO | Request com Bean Validation |
| `arrecadacao-application/src/main/java/.../application/dto/AtualizarUsuarioMusicaRequest.java` | DTO | Request com Bean Validation |
| `arrecadacao-application/src/main/java/.../application/dto/AlterarStatusRequest.java` | DTO | Request (justificativa) |
| `arrecadacao-application/src/main/java/.../application/dto/EnderecoRequest.java` | DTO | Request embeddable |
| `arrecadacao-application/src/main/java/.../application/dto/ContatoRequest.java` | DTO | Request embeddable |
| `arrecadacao-application/src/main/java/.../application/commands/CriarUsuarioMusicaCommand.java` | Command | Record |
| `arrecadacao-application/src/main/java/.../application/commands/AtualizarUsuarioMusicaCommand.java` | Command | Record |
| `arrecadacao-application/src/main/java/.../application/commands/InativarUsuarioMusicaCommand.java` | Command | Record |
| `arrecadacao-application/src/main/java/.../application/commands/AtivarUsuarioMusicaCommand.java` | Command | Record |
| `arrecadacao-application/src/main/java/.../application/commands/handlers/CriarUsuarioMusicaCommandHandler.java` | Handler | Criar + histórico inicial |
| `arrecadacao-application/src/main/java/.../application/commands/handlers/AtualizarUsuarioMusicaCommandHandler.java` | Handler | Atualizar campos mutáveis |
| `arrecadacao-application/src/main/java/.../application/commands/handlers/InativarUsuarioMusicaCommandHandler.java` | Handler | ATIVO → INATIVO |
| `arrecadacao-application/src/main/java/.../application/commands/handlers/AtivarUsuarioMusicaCommandHandler.java` | Handler | INATIVO → ATIVO |
| `arrecadacao-application/src/main/java/.../application/queries/ListarUsuariosMusicaQuery.java` | Query | Record com filtros |
| `arrecadacao-application/src/main/java/.../application/queries/BuscarUsuarioMusicaPorIdQuery.java` | Query | Record com UUID |
| `arrecadacao-application/src/main/java/.../application/queries/ListarHistoricoStatusQuery.java` | Query | Record com UUID |
| `arrecadacao-application/src/main/java/.../application/queries/handlers/ListarUsuariosMusicaQueryHandler.java` | Handler | Specification + Pageable |
| `arrecadacao-application/src/main/java/.../application/queries/handlers/BuscarUsuarioMusicaPorIdQueryHandler.java` | Handler | FindById |
| `arrecadacao-application/src/main/java/.../application/queries/handlers/ListarHistoricoStatusQueryHandler.java` | Handler | FindByUsuarioMusicaId |
| `arrecadacao-application/src/main/java/.../application/specification/UsuarioMusicaSpecification.java` | Specification | Filtros dinâmicos |
| `arrecadacao-api/src/main/java/.../api/controllers/UsuarioMusicaController.java` | Controller | 7 endpoints REST |
| `arrecadacao-domain/src/test/java/.../domain/valueobjects/CnpjTest.java` | Teste | Unitário: módulo 11, alfanumérico, edge cases |
| `arrecadacao-domain/src/test/java/.../domain/entities/UsuarioMusicaTest.java` | Teste | Unitário: factory, domain methods, guards |
| `arrecadacao-domain/src/test/java/.../domain/entities/HistoricoStatusUsuarioTest.java` | Teste | Unitário: factory, validações |
| `arrecadacao-application/src/test/java/.../application/commands/handlers/CriarUsuarioMusicaCommandHandlerTest.java` | Teste | Unitário: happy path, CNPJ duplicado, inválido |
| `arrecadacao-application/src/test/java/.../application/commands/handlers/AtualizarUsuarioMusicaCommandHandlerTest.java` | Teste | Unitário: happy path, not found |
| `arrecadacao-application/src/test/java/.../application/commands/handlers/InativarUsuarioMusicaCommandHandlerTest.java` | Teste | Unitário: happy path, já inativo |
| `arrecadacao-application/src/test/java/.../application/commands/handlers/AtivarUsuarioMusicaCommandHandlerTest.java` | Teste | Unitário: happy path, já ativo |
| `arrecadacao-application/src/test/java/.../application/queries/handlers/ListarUsuariosMusicaQueryHandlerTest.java` | Teste | Unitário: filtros, paginação |
| `arrecadacao-tests/src/test/java/.../infra/persistence/UsuarioMusicaPersistenceIntegrationTest.java` | Teste | Integração: Testcontainers + Flyway |
| `arrecadacao-tests/src/test/java/.../api/UsuarioMusicaEndpointsIntegrationTest.java` | Teste | Integração: endpoints HTTP completos |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `arrecadacao-api/src/main/java/.../api/config/GlobalExceptionHandler.java` | Adicionar handlers para exceções de domínio (409, 422, 404, 400) |
| `arrecadacao-api/src/main/java/.../api/config/SecurityConfig.java` | Configurar roles por endpoint (se `@PreAuthorize` não for suficiente) |
| `arrecadacao-api/src/main/java/.../api/config/CorsConfig.java` | Adicionar métodos POST, PUT ao allowed-methods (atualmente só GET/HEAD/OPTIONS) |
| `arrecadacao-application/pom.xml` | Adicionar dependência do `arrecadacao-domain` e spring-data-jpa (para Specification) |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `arrecadacao-domain/src/main/java/.../domain/entities/Rubrica.java` | Padrão de entidade imutável |
| `arrecadacao-domain/src/main/java/.../domain/entities/OutboxEvent.java` | Padrão de factory method + domain methods |
| `arrecadacao-infra/src/main/java/.../infra/persistence/JpaRubricaRepository.java` | Padrão adapter repository |
| `arrecadacao-infra/src/main/resources/db/migration/V1__create_tables.sql` | Padrão de migration |
| `arrecadacao-tests/src/test/java/.../infra/persistence/RubricaPersistenceIntegrationTest.java` | Padrão de teste integração |
| `services/cadastro-api/3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs` | Referência: algoritmo módulo 11 alfanumérico |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|--------------------|-----------------|-------------------|----------------|
| `GlobalExceptionHandler` | Extensão | Adicionar handlers de exceção. Baixo risco | Estender sem quebrar handler existente |
| `CorsConfig` | Extensão | Adicionar métodos HTTP. Baixo risco | Incluir POST, PUT nos allowed methods |
| `SecurityConfig` | Compatível | `@PreAuthorize` no controller. Baixo risco | Validar que method-security está habilitado |
| Schema `arrecadacao` | Nova tabela | 2 tabelas + índices. Sem impacto em existentes | Migration V3 + V4 via Flyway |
| F03 (Licenças) — downstream | Dependência futura | F03 consultará Usuário por ID e validará status ATIVO | Garantir que endpoint GET /{id} e status estão prontos |
| `arrecadacao-application/pom.xml` | Dependência | Precisa de spring-data-jpa para Specification | Adicionar dependência |

---

## Abordagem de Testes

### Testes Unitários (JUnit 5 + AssertJ + Mockito)

**Domain Layer:**
- `CnpjTest` — CNPJ numérico válido, alfanumérico válido, inválido (dígitos errados), null, vazio, < 14 chars, DVs não-numéricos, formatação
- `UsuarioMusicaTest` — factory `criar()`, `atualizar()`, `inativar()` (happy + guard), `ativar()` (happy + guard), razão social < 3 chars
- `HistoricoStatusUsuarioTest` — factory `criar()`, justificativa < 10 chars

**Application Layer (mock repositories):**
- `CriarUsuarioMusicaCommandHandlerTest` — happy path, CNPJ duplicado (409), CNPJ inválido (422)
- `AtualizarUsuarioMusicaCommandHandlerTest` — happy path, not found (404)
- `InativarUsuarioMusicaCommandHandlerTest` — happy path, já inativo (422), not found (404)
- `AtivarUsuarioMusicaCommandHandlerTest` — happy path, já ativo (422), not found (404)
- `ListarUsuariosMusicaQueryHandlerTest` — sem filtro, com filtros combinados, paginação

### Testes de Integração (Spring Boot Test + Testcontainers)

**UsuarioMusicaPersistenceIntegrationTest:**
- Flyway migration count (espera V1-V4)
- CRUD completo: criar, buscar, atualizar, verificar histórico
- Constraint unicidade CNPJ
- Filtros via Specification (razão social parcial, CNPJ parcial, status, cidade)

**UsuarioMusicaEndpointsIntegrationTest:**
- Todos os 7 endpoints HTTP
- Validação de request (400)
- CNPJ duplicado (409)
- CNPJ inválido (422)
- Not found (404)
- Inativar já inativo (422)
- Ativar já ativo (422)
- Paginação e filtros funcionais
- Security: consultor não pode criar/editar/inativar (403)

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Migration (V3 + V4)** — tabelas e índices (pré-requisito para tudo)
2. **Domain Layer** — Enum, Value Objects (Cnpj, Endereco, Contato), Entities, Exceptions, Repository interfaces
3. **Infrastructure** — Repositories JPA + Spring Data
4. **CQRS Foundation** — Query/Command interfaces, Handlers interfaces, Dispatchers
5. **Application: Commands** — 4 commands + handlers
6. **Application: Queries + DTOs** — 3 queries + handlers + Specification + DTOs
7. **API Layer** — Controller + GlobalExceptionHandler atualizado + CorsConfig
8. **Testes Unitários** — Domain + Application
9. **Testes de Integração** — Persistence + Endpoints

### Dependências Técnicas

- F01 (Seed de Rubricas) deve estar implementado (migrations V1-V2)
- PostgreSQL com extensão `pg_trgm` habilitada
- Keycloak configurado com roles `analista-arrecadacao` e `consultor-arrecadacao`

---

## Monitoramento e Observabilidade

- **Logs:** JSON estruturado. Log em INFO: criação de usuário (razão social, CNPJ mascarado), mudança de status. Log em WARN: CNPJ duplicado, CNPJ inválido
- **Health Check:** `/actuator/health` (já configurado — PostgreSQL auto-detectado)
- **Métricas:** Spring Boot Actuator default. Endpoint response time via Micrometer (se habilitado)

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---------|---------------|
| Cnpj como `@Embeddable` Value Object (não entidade separada) | CNPJ é atributo intrínseco do Usuário, não existe independentemente. Embedded simplifica queries |
| Endereco e Contato como `@Embeddable` (não tabela separada) | Relação 1:1 estrita, sem necessidade de referência independente. Colunas flat na mesma tabela |
| Histórico como entidade separada (não embedded collection) | Cresce indefinidamente; precisa de queries independentes (listagem); mais eficiente como tabela separada |
| `pg_trgm` para filtros ILIKE | Performance de busca parcial em strings. Suporta ILIKE sem full table scan |
| Specification Pattern para filtros dinâmicos | Spring Data nativo; compõe predicados AND sem query strings manuais; extensível para novos filtros |
| CQRS com Query/Command markers + Dispatcher | Type-safety; consistente com F01; separa leitura de escrita explicitamente |
| Domain methods retornam HistoricoStatusUsuario | Entity mantém controle do seu próprio estado; handler apenas persiste o retorno |
| Autor extraído do JWT (não input do usuário) | Evita falsificação; `SecurityContextHolder` → claim `preferred_username` |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| `pg_trgm` pode não estar habilitada no PostgreSQL do Docker Compose | Migration com `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| Concorrência em unicidade de CNPJ (race condition) | Constraint UNIQUE no banco + catch `DataIntegrityViolationException` → 409 |
| JWT claim `preferred_username` pode não existir | Fallback para claim `sub`; documentar configuração Keycloak esperada |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
