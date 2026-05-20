# Tech Spec — F02: Gestão de Titulares

> **PRD:** `tasks/prd-gestao-titulares/prd.md`
> **API Contract:** `tasks/prd-gestao-titulares/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F02
> **Data:** 2026-03-30

---

## Resumo Executivo

Esta Tech Spec cobre a implementação do CRUD completo de Titulares — a primeira feature do domínio Cadastro com operações de escrita. Introduz padrões que serão reutilizados por todas as features futuras: **Commands CQRS**, **Value Objects** (Cpf, Cnpj com validação alfanumérica RFB), **FluentValidation**, **paginação/filtros/ordenação server-side** e **proteção contra exclusão de entidades com vínculos**.

O código existente do F01 (Associações) define os padrões de leitura. O F02 estende para escrita, mantendo 100% de compatibilidade com a estrutura Clean Architecture já estabelecida.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Clean Architecture, CQRS Commands, Repository Pattern, Value Objects |
| `dotnet-code-quality` | FluentValidation, convenções PascalCase, error handling |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `common/restful-api` | Paginação, filtros, ordenação, ProblemDetails |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
services/cadastro-api/
├── 1-Services/Cadastro.API/
│   └── Endpoints/TitularEndpoints.cs           ← CRUD endpoints
├── 2-Application/Cadastro.Application/
│   └── Titulares/
│       ├── Commands/                            ← Create, Update, Delete
│       │   ├── CriarTitularCommand.cs
│       │   ├── CriarTitularCommandHandler.cs
│       │   ├── CriarTitularCommandValidator.cs  ← FluentValidation
│       │   ├── AtualizarTitularCommand.cs
│       │   ├── AtualizarTitularCommandHandler.cs
│       │   ├── AtualizarTitularCommandValidator.cs
│       │   ├── ExcluirTitularCommand.cs
│       │   └── ExcluirTitularCommandHandler.cs
│       ├── Queries/                             ← List (paginated), GetById
│       │   ├── ListarTitularesQuery.cs
│       │   ├── ListarTitularesQueryHandler.cs
│       │   ├── GetTitularByIdQuery.cs
│       │   └── GetTitularByIdQueryHandler.cs
│       └── Responses/
│           ├── TitularResponse.cs
│           └── TitularListResponse.cs
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/Titular.cs                      ← Entidade com Value Objects
│   ├── ValueObjects/
│   │   ├── Cpf.cs                               ← Validação módulo 11
│   │   └── Cnpj.cs                              ← Validação alfanumérica RFB
│   └── Interfaces/ITitularRepository.cs
├── 4-Infra/Cadastro.Infra/
│   ├── Data/
│   │   ├── Configurations/TitularConfiguration.cs
│   │   └── Migrations/XXXX_AddTitulares.cs
│   └── Repositories/TitularRepository.cs        ← Paginação + filtros
└── 5-Tests/
    ├── Cadastro.UnitTests/Titulares/
    └── Cadastro.IntegrationTests/TitularEndpointsTests.cs
```

### Fluxo de Dados (Create)

```
POST /api/v1/titulares
    → TitularEndpoints (deserialize JSON → CriarTitularCommand)
    → Dispatcher.SendAsync(command)
    → CriarTitularCommandValidator (FluentValidation)
    → CriarTitularCommandHandler
        → Cpf.Create(documento) ou Cnpj.Create(documento) [Value Object validation]
        → ITitularRepository.ExisteDocumentoAsync(documento) [unicidade]
        → IAssociacaoRepository.GetByIdAsync(associacaoId) [FK válida]
        → new Titular(...) [construtor com validação]
        → ITitularRepository.AddAsync(titular)
        → UnitOfWork.SaveChangesAsync()
    → TitularResponse (DTO)
    → 201 Created + Location header
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Value Objects como records (Cpf, Cnpj, CaeIpi) | Records: imutáveis por natureza, igualdade por valor, menos boilerplate. Encapsulam validação algorítmica; previnem documento inválido em qualquer ponto do sistema |
| Entidade usa VOs diretamente (não strings) | Cpf? e Cnpj? como propriedades da entidade Titular. EF Core persiste via HasConversion. CHECK constraint no banco garante consistência tipo↔documento |
| FluentValidation nos Commands | Valida shape do request (campos obrigatórios, tamanhos) antes do handler; separa validação de formato vs regras de negócio |
| Paginação via IQueryable + Skip/Take | Server-side; EF Core traduz para SQL OFFSET/LIMIT |
| Filtros como Expression<Func<T,bool>> | Composição dinâmica de filtros no repository |
| UnitOfWork via DbContext.SaveChangesAsync | Padrão já estabelecido; sem interface extra |
| Documento imutável após criação | RF-11 do PRD; campo não aceito no PUT |
| documentoFormatado calculado no response | Lógica de formatação no mapper, não no banco |
| Soft check de vínculos no DELETE | Verifica titularidades_autorais e participacoes_conexas antes de excluir (tabelas futuras F04/F06) |

---

## Design de Implementação

### Value Objects como Records (Domain Layer)

> **Decisão:** Value Objects implementados como `record` — imutáveis por natureza, igualdade por valor, menos boilerplate. Factory method `Create` encapsula validação; construtor privado impede criação sem validação.

```csharp
// 3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs
public record Cpf
{
    public string Valor { get; }

    private Cpf(string valor) => Valor = valor;

    public static Cpf Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^0-9]", "");
        if (limpo.Length != 11 || !IsValid(limpo))
            throw new DomainException("CPF inválido");
        return new Cpf(limpo);
    }

    private static bool IsValid(string cpf) { /* módulo 11 numérico */ }

    public string Formatado => $"{Valor[..3]}.{Valor[3..6]}.{Valor[6..9]}-{Valor[9..]}";
}
```

```csharp
// 3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs
public record Cnpj
{
    public string Valor { get; }

    private Cnpj(string valor) => Valor = valor.ToUpperInvariant();

    public static Cnpj Create(string valor)
    {
        var limpo = Regex.Replace(valor ?? "", @"[^a-zA-Z0-9]", "").ToUpperInvariant();
        if (limpo.Length != 14 || !IsValid(limpo))
            throw new DomainException("CNPJ inválido");
        return new Cnpj(limpo);
    }

    private static bool IsValid(string cnpj)
    {
        // DVs finais devem ser numéricos
        if (!char.IsDigit(cnpj[12]) || !char.IsDigit(cnpj[13])) return false;

        // Módulo 11 com conversão ASCII - 48 (suporta alfanumérico)
        int[] weights1 = { 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        int[] weights2 = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
        // ... cálculo conforme docs/validacoes/cnpj.md
    }

    public string Formatado
    {
        get
        {
            // Numérico: 00.000.000/0001-00
            // Alfanumérico: A1.B2C.3D4/1A2B-99
            return $"{Valor[..2]}.{Valor[2..5]}.{Valor[5..8]}/{Valor[8..12]}-{Valor[12..]}";
        }
    }
}
```

```csharp
// 3-Domain/Cadastro.Domain/ValueObjects/CaeIpi.cs
public record CaeIpi
{
    public string Valor { get; }

    private CaeIpi(string valor) => Valor = valor;

    public static CaeIpi Create(string valor)
    {
        var limpo = valor?.Trim() ?? "";
        if (limpo.Length == 0 || limpo.Length > 20)
            throw new DomainException("CAE/IPI deve ter entre 1 e 20 caracteres");
        return new CaeIpi(limpo);
    }
}
```

### Entidade Titular (Domain Layer)

A entidade usa os Value Objects `Cpf`, `Cnpj` e `CaeIpi` diretamente — não strings. O tipo (PF/PJ) é inferido pelo VO usado. O EF Core persiste o valor interno via conversores na Configuration.

```csharp
// 3-Domain/Cadastro.Domain/Entities/Titular.cs
public class Titular
{
    public Guid Id { get; private set; }
    public string Nome { get; private set; }
    public TipoTitular Tipo { get; private set; }
    public Cpf? Cpf { get; private set; }                 // Preenchido se PF
    public Cnpj? Cnpj { get; private set; }               // Preenchido se PJ
    public string Nacionalidade { get; private set; }
    public CaeIpi? CaeIpi { get; private set; }           // Opcional
    public Guid AssociacaoId { get; private set; }
    public StatusTitular Status { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    // Navigation
    public Associacao Associacao { get; private set; }

    private Titular() { } // EF Core

    // Factory: PF com CPF
    public static Titular CriarPessoaFisica(string nome, Cpf cpf,
        string nacionalidade, Guid associacaoId, CaeIpi? caeIpi = null)
    {
        return new Titular
        {
            Id = Guid.NewGuid(),
            Nome = nome ?? throw new ArgumentNullException(nameof(nome)),
            Tipo = TipoTitular.PF,
            Cpf = cpf ?? throw new ArgumentNullException(nameof(cpf)),
            Cnpj = null,
            Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade)),
            AssociacaoId = associacaoId,
            CaeIpi = caeIpi,
            Status = StatusTitular.Ativo,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    // Factory: PJ com CNPJ
    public static Titular CriarPessoaJuridica(string nome, Cnpj cnpj,
        string nacionalidade, Guid associacaoId, CaeIpi? caeIpi = null)
    {
        return new Titular
        {
            Id = Guid.NewGuid(),
            Nome = nome ?? throw new ArgumentNullException(nameof(nome)),
            Tipo = TipoTitular.PJ,
            Cpf = null,
            Cnpj = cnpj ?? throw new ArgumentNullException(nameof(cnpj)),
            Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade)),
            AssociacaoId = associacaoId,
            CaeIpi = caeIpi,
            Status = StatusTitular.Ativo,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    // Propriedade derivada: documento para unicidade e busca
    public string Documento => Tipo == TipoTitular.PF ? Cpf!.Valor : Cnpj!.Valor;
    public string DocumentoFormatado => Tipo == TipoTitular.PF ? Cpf!.Formatado : Cnpj!.Formatado;

    public void Atualizar(string nome, string nacionalidade,
                          Guid associacaoId, StatusTitular status, CaeIpi? caeIpi)
    {
        Nome = nome ?? throw new ArgumentNullException(nameof(nome));
        Nacionalidade = nacionalidade ?? throw new ArgumentNullException(nameof(nacionalidade));
        AssociacaoId = associacaoId;
        Status = status;
        CaeIpi = caeIpi;
        AtualizadoEm = DateTime.UtcNow;
    }
}

public enum TipoTitular { PF, PJ }
public enum StatusTitular { Ativo, Falecido, Transferindo }
```

### EF Core Configuration — Value Object Conversores

```csharp
// Na TitularConfiguration:
builder.Property(t => t.Cpf)
    .HasConversion(
        cpf => cpf != null ? cpf.Valor : null,
        valor => valor != null ? Cpf.Create(valor) : null)
    .HasColumnName("Cpf")
    .HasMaxLength(11);

builder.Property(t => t.Cnpj)
    .HasConversion(
        cnpj => cnpj != null ? cnpj.Valor : null,
        valor => valor != null ? Cnpj.Create(valor) : null)
    .HasColumnName("Cnpj")
    .HasMaxLength(14);

builder.Property(t => t.CaeIpi)
    .HasConversion(
        cae => cae != null ? cae.Valor : null,
        valor => valor != null ? CaeIpi.Create(valor) : null)
    .HasColumnName("CaeIpi")
    .HasMaxLength(20);

// Índice de unicidade composto (apenas um preenchido por vez)
builder.HasIndex(t => t.Cpf).IsUnique().HasFilter("\"Cpf\" IS NOT NULL");
builder.HasIndex(t => t.Cnpj).IsUnique().HasFilter("\"Cnpj\" IS NOT NULL");
```
```

### Interface do Repositório (Domain Layer)

```csharp
// 3-Domain/Cadastro.Domain/Interfaces/ITitularRepository.cs
public interface ITitularRepository
{
    Task<(IEnumerable<Titular> Items, int Total)> ListarAsync(
        TitularFiltro filtro, CancellationToken cancellationToken);
    Task<Titular?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> ExisteDocumentoAsync(string documento, CancellationToken cancellationToken);
    Task<bool> ExisteDocumentoAsync(string documento, Guid excludeId, CancellationToken cancellationToken);
    Task<Titular> AddAsync(Titular titular, CancellationToken cancellationToken);
    void Update(Titular titular);
    void Delete(Titular titular);
    Task<bool> PossuiVinculosAsync(Guid titularId, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}

public record TitularFiltro(
    int Page = 1,
    int Size = 20,
    string? Sort = "nome",
    string? Nome = null,
    string? Documento = null,
    Guid? AssociacaoId = null,
    StatusTitular? Status = null);
```

### Commands CQRS (Application Layer)

```csharp
// Criar
public record CriarTitularCommand(
    string Nome, string Tipo, string Documento,
    string Nacionalidade, Guid AssociacaoId, string? CaeIpi
) : ICommand<TitularResponse>;

// Atualizar
public record AtualizarTitularCommand(
    Guid Id, string Nome, string Nacionalidade,
    Guid AssociacaoId, string Status, string? CaeIpi
) : ICommand<TitularResponse>;

// Excluir
public record ExcluirTitularCommand(Guid Id) : ICommand<bool>;
```

### Dispatcher — Extensão para Commands

O `Dispatcher` existente já possui `QueryAsync`. Adicionar `SendAsync` para commands:

```csharp
// Adição ao Dispatcher existente
public async Task<TResult> SendAsync<TResult>(
    ICommand<TResult> command, CancellationToken cancellationToken = default)
{
    var handlerType = typeof(ICommandHandler<,>)
        .MakeGenericType(command.GetType(), typeof(TResult));
    var handler = _serviceProvider.GetService(handlerType)
        ?? throw new InvalidOperationException($"No handler for {command.GetType().Name}");
    var method = handlerType.GetMethod("HandleAsync")!;
    return await (Task<TResult>)method.Invoke(handler, [command, cancellationToken])!;
}
```

### Paginação + Filtros (Infra Layer)

```csharp
// TitularRepository.ListarAsync
public async Task<(IEnumerable<Titular> Items, int Total)> ListarAsync(
    TitularFiltro filtro, CancellationToken cancellationToken)
{
    var query = _context.Titulares
        .AsNoTracking()
        .Include(t => t.Associacao)
        .AsQueryable();

    // Filtros dinâmicos
    if (!string.IsNullOrWhiteSpace(filtro.Nome))
        query = query.Where(t => EF.Functions.ILike(t.Nome, $"%{filtro.Nome}%"));
    if (!string.IsNullOrWhiteSpace(filtro.Documento))
        query = query.Where(t => t.Documento.Contains(filtro.Documento));
    if (filtro.AssociacaoId.HasValue)
        query = query.Where(t => t.AssociacaoId == filtro.AssociacaoId.Value);
    if (filtro.Status.HasValue)
        query = query.Where(t => t.Status == filtro.Status.Value);

    var total = await query.CountAsync(cancellationToken);

    // Ordenação dinâmica
    query = filtro.Sort switch
    {
        "-nome" => query.OrderByDescending(t => t.Nome),
        "associacao" => query.OrderBy(t => t.Associacao.Sigla),
        "-associacao" => query.OrderByDescending(t => t.Associacao.Sigla),
        "status" => query.OrderBy(t => t.Status),
        "-status" => query.OrderByDescending(t => t.Status),
        _ => query.OrderBy(t => t.Nome), // default
    };

    var items = await query
        .Skip((filtro.Page - 1) * filtro.Size)
        .Take(filtro.Size)
        .ToListAsync(cancellationToken);

    return (items, total);
}
```

### Endpoints (API Layer)

```csharp
public static class TitularEndpoints
{
    public static void MapTitularEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/titulares")
            .WithTags("Titulares");

        group.MapGet("/", ListarTitulares);
        group.MapPost("/", CriarTitular);
        group.MapGet("/{id:guid}", BuscarPorId);
        group.MapPut("/{id:guid}", AtualizarTitular);
        group.MapDelete("/{id:guid}", ExcluirTitular);
    }
}
```

### Formato do documentoFormatado

A formatação vem diretamente das propriedades `Formatado` dos Value Objects — sem lógica extra no mapper:

```csharp
// No mapeamento Titular → TitularResponse:
documento: titular.Documento,               // Valor cru (Cpf.Valor ou Cnpj.Valor)
documentoFormatado: titular.DocumentoFormatado,  // Cpf.Formatado ou Cnpj.Formatado
```

---

## Modelos de Dados

### Schema PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE cadastro.titulares (
    "Id"              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    "Nome"            VARCHAR(200)    NOT NULL,
    "Tipo"            VARCHAR(2)      NOT NULL,  -- 'PF' ou 'PJ'
    "Cpf"             VARCHAR(11)     NULL,       -- Preenchido se PF (Value Object)
    "Cnpj"            VARCHAR(14)     NULL,       -- Preenchido se PJ (Value Object, alfanumérico)
    "Nacionalidade"   VARCHAR(100)    NOT NULL,
    "CaeIpi"          VARCHAR(20)     NULL,       -- Value Object (opcional)
    "AssociacaoId"    UUID            NOT NULL REFERENCES cadastro.associacoes("Id"),
    "Status"          VARCHAR(15)     NOT NULL DEFAULT 'ATIVO',
    "CriadoEm"       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "AtualizadoEm"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_titulares_tipo CHECK ("Tipo" IN ('PF', 'PJ')),
    CONSTRAINT ck_titulares_status CHECK ("Status" IN ('ATIVO', 'FALECIDO', 'TRANSFERINDO')),
    CONSTRAINT ck_titulares_documento CHECK (
        ("Tipo" = 'PF' AND "Cpf" IS NOT NULL AND "Cnpj" IS NULL) OR
        ("Tipo" = 'PJ' AND "Cnpj" IS NOT NULL AND "Cpf" IS NULL)
    )
);

CREATE UNIQUE INDEX uq_titulares_cpf ON cadastro.titulares ("Cpf") WHERE "Cpf" IS NOT NULL;
CREATE UNIQUE INDEX uq_titulares_cnpj ON cadastro.titulares ("Cnpj") WHERE "Cnpj" IS NOT NULL;
CREATE INDEX ix_titulares_nome ON cadastro.titulares USING gin ("Nome" gin_trgm_ops);
CREATE INDEX ix_titulares_associacao ON cadastro.titulares ("AssociacaoId");
CREATE INDEX ix_titulares_status ON cadastro.titulares ("Status");
```

> **Nota:** CHECK constraint `ck_titulares_documento` garante no nível do banco que PF tem CPF preenchido (sem CNPJ) e PJ tem CNPJ preenchido (sem CPF). Índices unique com filtro parcial (`WHERE IS NOT NULL`) permitem unicidade apenas nos preenchidos.

---

## Endpoints de API

Conforme `api-contract.yaml`. Resumo:

| Método | Path | Handler | Response |
|--------|------|---------|----------|
| `GET` | `/api/v1/titulares` | ListarTitularesQueryHandler | 200 (paginado) |
| `POST` | `/api/v1/titulares` | CriarTitularCommandHandler | 201 / 409 / 422 |
| `GET` | `/api/v1/titulares/{id}` | GetTitularByIdQueryHandler | 200 / 404 |
| `PUT` | `/api/v1/titulares/{id}` | AtualizarTitularCommandHandler | 200 / 404 / 422 |
| `DELETE` | `/api/v1/titulares/{id}` | ExcluirTitularCommandHandler | 204 / 404 / 409 |

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/Cadastro.Domain/Entities/Titular.cs` | Entidade | Entidade com props encapsuladas, método Atualizar |
| `3-Domain/Cadastro.Domain/ValueObjects/Cpf.cs` | Value Object (record) | Validação módulo 11, formatação |
| `3-Domain/Cadastro.Domain/ValueObjects/Cnpj.cs` | Value Object (record) | Validação alfanumérica RFB, formatação |
| `3-Domain/Cadastro.Domain/ValueObjects/CaeIpi.cs` | Value Object (record) | Validação de tamanho (1-20 chars) |
| `3-Domain/Cadastro.Domain/Enums/TipoTitular.cs` | Enum | PF, PJ |
| `3-Domain/Cadastro.Domain/Enums/StatusTitular.cs` | Enum | Ativo, Falecido, Transferindo |
| `3-Domain/Cadastro.Domain/Interfaces/ITitularRepository.cs` | Interface | CRUD + ListarAsync paginado + PossuiVinculosAsync |
| `3-Domain/Cadastro.Domain/Exceptions/DomainException.cs` | Exception | Exception base para regras de domínio |
| **Application — Commands** | | |
| `2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommand.cs` | Command | Record com dados de criação |
| `2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommandHandler.cs` | Handler | Valida documento, verifica unicidade, cria entidade |
| `2-Application/Cadastro.Application/Titulares/Commands/CriarTitularCommandValidator.cs` | Validator | FluentValidation — campos obrigatórios, tamanhos |
| `2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommand.cs` | Command | Record com dados editáveis |
| `2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommandHandler.cs` | Handler | Busca entidade, chama Atualizar() |
| `2-Application/Cadastro.Application/Titulares/Commands/AtualizarTitularCommandValidator.cs` | Validator | FluentValidation |
| `2-Application/Cadastro.Application/Titulares/Commands/ExcluirTitularCommand.cs` | Command | Record com Id |
| `2-Application/Cadastro.Application/Titulares/Commands/ExcluirTitularCommandHandler.cs` | Handler | Verifica vínculos, exclui |
| **Application — Queries** | | |
| `2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQuery.cs` | Query | Record com filtros e paginação |
| `2-Application/Cadastro.Application/Titulares/Queries/ListarTitularesQueryHandler.cs` | Handler | Delega para repository, mapeia response |
| `2-Application/Cadastro.Application/Titulares/Queries/GetTitularByIdQuery.cs` | Query | Record com Id |
| `2-Application/Cadastro.Application/Titulares/Queries/GetTitularByIdQueryHandler.cs` | Handler | Busca + mapeamento |
| **Application — Responses** | | |
| `2-Application/Cadastro.Application/Titulares/Responses/TitularResponse.cs` | DTO | Response com documentoFormatado + associação aninhada |
| `2-Application/Cadastro.Application/Titulares/Responses/TitularListResponse.cs` | DTO | Wrapper com data[] + pagination |
| `2-Application/Cadastro.Application/Common/Responses/PaginationResponse.cs` | DTO | Reutilizável: page, size, total, totalPages |
| **Application — Exceptions** | | |
| `2-Application/Cadastro.Application/Common/Exceptions/ConflictException.cs` | Exception | Para documento duplicado e vínculos |
| `2-Application/Cadastro.Application/Common/Exceptions/ValidationException.cs` | Exception | Para erros de FluentValidation |
| **Infra** | | |
| `4-Infra/Cadastro.Infra/Data/Configurations/TitularConfiguration.cs` | Config EF | Fluent API, FK, unique, check constraints |
| `4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddTitulares.cs` | Migration | Tabela titulares + extensão pg_trgm + índices |
| `4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs` | Repository | CRUD + paginação + filtros dinâmicos |
| **API** | | |
| `1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` | Endpoint | 5 endpoints CRUD |
| **Testes** | | |
| `5-Tests/Cadastro.UnitTests/Titulares/CriarTitularCommandHandlerTests.cs` | Teste | Criação: happy path, duplicata, CPF/CNPJ inválido |
| `5-Tests/Cadastro.UnitTests/Titulares/AtualizarTitularCommandHandlerTests.cs` | Teste | Atualização: happy path, não encontrado |
| `5-Tests/Cadastro.UnitTests/Titulares/ExcluirTitularCommandHandlerTests.cs` | Teste | Exclusão: happy path, com vínculos |
| `5-Tests/Cadastro.UnitTests/Titulares/ListarTitularesQueryHandlerTests.cs` | Teste | Listagem paginada |
| `5-Tests/Cadastro.UnitTests/ValueObjects/CpfTests.cs` | Teste | CPF válido, inválido, formatação |
| `5-Tests/Cadastro.UnitTests/ValueObjects/CnpjTests.cs` | Teste | CNPJ numérico, alfanumérico, inválido, formatação |
| `5-Tests/Cadastro.UnitTests/ValueObjects/CaeIpiTests.cs` | Teste | Válido, vazio, excede 20 chars |
| `5-Tests/Cadastro.IntegrationTests/TitularEndpointsTests.cs` | Teste | Todos os endpoints + cenários de erro |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` | Adicionar `DbSet<Titular> Titulares` e `ApplyConfiguration(new TitularConfiguration())` |
| `1-Services/Cadastro.API/Program.cs` | Registrar `ITitularRepository`, `app.MapTitularEndpoints()`, registrar validators, registrar command handlers via Scrutor, adicionar extensão GlobalExceptionHandler para ConflictException e ValidationException |
| `1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` | Adicionar mapeamento: `ConflictException → 409`, `ValidationException → 400`, `DomainException → 422` |
| `2-Application/Cadastro.Application/Common/CQRS/Dispatcher.cs` | Adicionar método `SendAsync` para ICommand<T> |
| `2-Application/Cadastro.Application/Common/CQRS/IDispatcher.cs` | Adicionar `Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken ct)` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `3-Domain/Cadastro.Domain/Entities/Associacao.cs` | FK Titular → Associacao |
| `3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs` | Verificar que associação existe ao criar titular |
| `4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` | UUIDs das associações para testes |
| `1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs` | Padrão a seguir para endpoints |
| `docs/validacoes/cnpj.md` | Algoritmo de validação CNPJ alfanumérico RFB |
| `tasks/prd-gestao-titulares/api-contract.yaml` | Contrato de API (fonte de verdade) |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| Dispatcher CQRS | Extensão | Adicionar SendAsync para Commands (primeira feature com escrita) | Risco baixo — extensão compatível |
| GlobalExceptionHandler | Extensão | Adicionar ConflictException (409), ValidationException (400), DomainException (422) | Risco baixo — switch expression |
| CadastroDbContext | Extensão | Adicionar DbSet<Titular> | Risco baixo |
| Program.cs | Extensão | Registrar ITitularRepository, validators, endpoints | Risco baixo |
| Features F04, F05, F06 (futuras) | Dependência | Titular é pré-requisito para vincular a obras e fonogramas | Design da entidade deve prever FK reversa |
| PostgreSQL | Extensão pg_trgm | Necessária para índice trigram (ILIKE performático) | Verificar se extensão está disponível no servidor |

---

## Abordagem de Testes

### Testes Unitários

| Classe | Cenários |
|--------|----------|
| `CpfTests` | CPF válido, CPF inválido (dígitos), CPF com formatação (limpa automaticamente), formatação de saída |
| `CnpjTests` | CNPJ numérico válido, CNPJ alfanumérico válido, CNPJ inválido, DVs não-numéricos, formatação numérica e alfanumérica |
| `CriarTitularCommandHandlerTests` | Happy path PF, happy path PJ, documento duplicado (409), CPF inválido (422), CNPJ inválido (422), associação inexistente (404) |
| `AtualizarTitularCommandHandlerTests` | Happy path, titular não encontrado (404) |
| `ExcluirTitularCommandHandlerTests` | Happy path (sem vínculos), titular com vínculos (409), não encontrado (404) |
| `ListarTitularesQueryHandlerTests` | Retorna lista paginada, filtro por nome, lista vazia |

### Testes de Integração

| Cenário | Endpoint | Status Esperado |
|---------|----------|----------------|
| Criar PF com CPF válido | POST /titulares | 201 |
| Criar PJ com CNPJ alfanumérico | POST /titulares | 201 |
| Criar com CPF duplicado | POST /titulares | 409 |
| Criar com CPF inválido | POST /titulares | 422 |
| Listar com paginação | GET /titulares?page=1&size=5 | 200 com pagination |
| Filtrar por nome parcial | GET /titulares?nome=dj | 200 filtrado |
| Buscar por ID existente | GET /titulares/{id} | 200 |
| Buscar por ID inexistente | GET /titulares/{id} | 404 |
| Atualizar titular | PUT /titulares/{id} | 200 |
| Excluir titular sem vínculos | DELETE /titulares/{id} | 204 |

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Value Objects** — Cpf, Cnpj (validação encapsulada, testável isoladamente)
2. **Domain** — Entidade Titular, Enums, ITitularRepository, DomainException
3. **Infra** — TitularConfiguration, Migration, TitularRepository
4. **Application — Exceptions** — ConflictException, ValidationException
5. **Application — Queries** — ListarTitulares, GetTitularById + handlers + responses
6. **Application — Commands** — Criar, Atualizar, Excluir + handlers + validators
7. **Dispatcher** — Adicionar SendAsync para commands
8. **API** — TitularEndpoints + modificar Program.cs + GlobalExceptionHandler
9. **Testes unitários** — Value Objects + Handlers
10. **Testes de integração** — Endpoints completos

### Dependências Técnicas

- PostgreSQL com extensão `pg_trgm` (para índice trigram)
- F01 concluída (Associações no banco — FK obrigatória)
- FluentValidation já instalado (ou instalar via NuGet)

---

## Mapeamento de Regras de Negócio para Implementação

| Regra (Domain Doc) | Camada | Implementação |
|-------|--------|---------------|
| RN-07 (acúmulo de papéis) | — | Não impacta F02 diretamente — papéis são definidos em F04/F06 |
| RN-08 (precisão decimal) | Domain | Value Objects usam string para documento, decimal para percentuais futuros |
| RN-10 (FALECIDO informativo) | Domain | Enum StatusTitular — sem regras especiais para FALECIDO |
| RN-11 (Editor PJ) | — | Não impacta F02 — será validado em F04 (Titularidades Autorais) |

| Requisito (PRD) | Camada | Implementação |
|-----------------|--------|---------------|
| RF-02 (CPF válido) | Domain | Value Object Cpf.Create() |
| RF-03 (CNPJ alfanumérico) | Domain | Value Object Cnpj.Create() com ASCII - 48 |
| RF-04 (Value Objects) | Domain | Cpf, Cnpj classes sealed |
| RF-05 (unicidade) | Application + Infra | ExisteDocumentoAsync → ConflictException |
| RF-10 (PF→CPF, PJ→CNPJ) | Application | Validator + Handler cross-check tipo×documento |
| RF-11 (tipo imutável) | Application | AtualizarCommand não inclui tipo/documento |
| RF-13 (paginação) | Infra | Skip/Take no repository |
| RF-14 (ordenação) | Infra | Switch expression no repository |
| RF-15-18 (filtros) | Infra | Where dinâmicos com ILike/Contains |
| RF-23 (proteger exclusão) | Application + Infra | PossuiVinculosAsync → ConflictException |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*

---

## Adendo - Analise do Codigo Implementado (2026-05-20)

Esta secao foi apendada apos analise do codigo atual. Ela nao altera a especificacao original; registra o estado real da implementacao e os pontos tecnicos que divergiram ou foram adicionados depois.

### Arquivos Relevantes Observados

| Area | Caminhos principais |
|------|---------------------|
| API | `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` |
| Application | `services/cadastro-api/2-Application/Cadastro.Application/Titulares/Commands`, `Queries`, `Responses` |
| Domain | `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Titular.cs`, `ValueObjects/Cpf.cs`, `ValueObjects/Cnpj.cs`, `ValueObjects/CaeIpi.cs`, `Interfaces/ITitularRepository.cs` |
| Infra | `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs`, `Data/Configurations/TitularConfiguration.cs`, migrations `20260330161039_AddTitulares` e `20260403190454_AddCodigo_CampoCodigo` |
| Testes | `services/cadastro-api/5-Tests/Cadastro.UnitTests/Titulares`, `ValueObjects`, `Cadastro.IntegrationTests/TitularEndpointsTests.cs` |

### Diferencas e Acrescimos na Implementacao Backend

| Tema | Estado implementado |
|------|---------------------|
| Codigo sequencial | A entidade `Titular` possui `Codigo` (`long`) gerado por `cadastro.seq_titulares_codigo`, com indice unico `uq_titulares_codigo`. O campo aparece em `TitularResponse`, `AssociacaoResumoResponse` tambem inclui `Codigo`, e `ListarTitularesQuery`/`TitularFiltro` aceitam filtro `Codigo` |
| Endpoints com auth opcional | `MapTitularEndpoints(this WebApplication app, bool authEnabled)` aplica `RequireCadastroPermission(...)`; quando `AUTH_ENABLED=false`, as rotas usam `AllowAnonymous()` |
| Permissoes | As rotas usam `cadastro:default:titular:listar`, `visualizar`, `criar`, `editar` e `excluir` via `CadastroPermissions` |
| Registro de servicos | `Program.cs` registra repositorios, dispatcher, handlers via Scrutor, validators, outbox, RabbitMQ, worker de outbox, consumer de identidade, authz SDK e auditoria |
| Outbox de dominio | `CriarTitularCommandHandler` chama `IOutboxEventWriter.AddEvent("cadastro.titular.criado", ...)` antes de `SaveChangesAsync`, mantendo o evento na mesma transacao do cadastro |
| Auditoria transversal | `CriarTitularCommandHandler`, `AtualizarTitularCommandHandler` e `ExcluirTitularCommandHandler` publicam auditoria via `ITitularAuditPublisher`, com eventos `USER_ACTION` e `DATA_CHANGE` |
| Atualizacao com tracking | `ITitularRepository` ganhou `GetByIdForUpdateAsync`; o handler de atualizacao usa entidade rastreada para persistir corretamente mudancas em `AssociacaoId` |
| Consulta de documento | `TitularRepository` usa `Database.SqlQuery<T>` parametrizado para unicidade, filtro por documento e autocomplete, porque o LINQ do EF Core nao traduz acesso a `Cpf.Valor`/`Cnpj.Valor` apos `HasConversion` |
| Autocomplete | `GET /api/v1/titulares/busca` fica mapeado em `TitularidadeEndpoints` e usa `BuscarTitularesQuery` com `q` e `limit`; a permissao aplicada e `cadastro:default:titularidade:buscar` |
| Exclusao protegida | `PossuiVinculosAsync` consulta `TitularidadesAutorais` e `ParticipacoesConexas`; a protecao deixou de ser placeholder porque F04/F06 ja possuem tabelas reais |
| ProblemDetails | `GlobalExceptionHandler` cobre `NotFoundException`, `ConflictException`, `StatusConflictException`, `ValidationException`, `DomainException`, `ExternalServiceException`, `DepuracaoNecessariaException` e `PreRequisitosException` |
| Migrations | `AddTitulares` cria tabela, indices parciais de CPF/CNPJ, `pg_trgm`, check constraint tipo-documento e indice GIN em nome; `AddCodigo_CampoCodigo` adiciona codigo sequencial a titulares e demais cadastros |

### Estado do Contrato de API Observado

| Endpoint | Observacao de implementacao |
|----------|-----------------------------|
| `GET /api/v1/titulares` | Aceita `page`, `size`, `sort`, `codigo`, `nome`, `documento`, `associacaoId`, `status` |
| `POST /api/v1/titulares` | Cria PF/PJ, valida shape por FluentValidation, valida documento por Value Object, verifica associacao e unicidade |
| `GET /api/v1/titulares/{id:guid}` | Retorna 200 com associacao aninhada ou 404 via `NotFoundException`; strings nao UUID retornam 404 por constraint de rota |
| `PUT /api/v1/titulares/{id:guid}` | Atualiza nome, nacionalidade, associacao, status e CAE/IPI; tipo e documento permanecem fora do command |
| `DELETE /api/v1/titulares/{id:guid}` | Retorna 204 se sem vinculos; retorna 409 se houver titularidades autorais ou participacoes conexas |
| `GET /api/v1/titulares/busca` | Endpoint adicional para autocomplete de vinculos, buscando por nome ou documento |

### Pontos de Atencao Tecnica

| Ponto | Detalhe |
|-------|---------|
| Ordenacao por codigo | `ListarTitularesQuery` aceita `sort`, e o frontend envia `codigo`/`-codigo`, mas `TitularRepository.ListarAsync` ainda nao trata esses valores no switch; a API cai no fallback de ordenacao por nome |
| Normalizacao de documento | A busca por documento normaliza caracteres nao alfanumericos e compara em uppercase contra `Cpf` e `Cnpj`, o que atende CPF numerico e CNPJ alfanumerico |
| Status no validator | `AtualizarTitularCommandValidator` aceita `ATIVO`, `FALECIDO` e `TRANSFERINDO`; o parse final usa `Enum.Parse<StatusTitular>(..., ignoreCase: true)` |
| CAE/IPI | O backend aceita `CaeIpi` como texto aparado de 1 a 20 caracteres; a restricao mais forte de mascara numerica ocorre apenas no frontend atual |
| Contrato legado | Alguns documentos no diretorio ainda mencionam auth retroativa ou caminhos antigos `tasks/prd-gestao-titulares`; o codigo atual esta em `tasks/cadastro/done-prd-gestao-titulares` e auth ja esta aplicado quando habilitado |

### Validacao Observada

| Fonte | Resultado |
|-------|-----------|
| `tasks.md` | 15 tarefas marcadas como concluidas |
| QA consolidado | 39/39 cenarios aprovados, incluindo revalidacao de bugs de edicao de associacao, UUID zero e mensagens 404 em portugues |
| Testes de codigo | Existem testes unitarios para handlers e Value Objects, alem de testes de integracao de endpoints de titulares |
