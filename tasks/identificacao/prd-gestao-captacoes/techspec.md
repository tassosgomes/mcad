# Especificação Técnica — F01: Gestão de Captações

> **PRD:** `tasks/prd-gestao-captacoes/prd.md`
> **API Contract:** `tasks/prd-gestao-captacoes/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-02

---

## Resumo Executivo

Esta feature cria o serviço backend de Identificação (`identificacao-api`) e o módulo frontend correspondente, seguindo os mesmos padrões arquiteturais do serviço de Cadastro: Clean Architecture em 4 camadas, CQRS com Dispatcher customizado, Minimal APIs, EF Core com schema isolado (`identificacao`), FluentValidation e autenticação JWT via Keycloak.

A implementação inclui duas entidades (Captação e Rubrica), 5 command/query handlers, 2 endpoints de recurso, seed de 7 rubricas, migrations para o schema `identificacao`, e o módulo React com listagem filtrada, formulários de criação/edição e exclusão com confirmação.

---

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `csharp-dotnet-architecture` | Clean Architecture 4 camadas, namespaces por agregado |
| `dotnet-dependency-config` | EF Core 9, FluentValidation, Scrutor, Npgsql |
| `dotnet-code-quality` | PascalCase, factory methods, private setters |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq |
| `react-architecture` | Feature-based modules, TanStack Query, React Router |
| `common-restful-api` | REST resource-oriented, RFC 7807 ProblemDetails |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend       │────▶│ Identificação   │
│   React/Vite     │     │ API (.NET 8)    │
│   /identificacao │     │ :5100           │
└─────────────────┘     └────────┬────────┘
                                 │
                     ┌───────────▼───────────┐
                     │  PostgreSQL 16         │
                     │  schema: identificacao │
                     └───────────────────────┘
```

**Componentes desta feature:**
- **Identificacao.API** — Minimal API endpoints, exception handler, auth policies
- **Identificacao.Application** — Commands, Queries, Validators, Responses (CQRS)
- **Identificacao.Domain** — Entidades Captacao e Rubrica, enums, interfaces de repositório
- **Identificacao.Infra** — DbContext, Repositories, Migrations, Seeds
- **Frontend module** — `features/identificacao/captacoes/` (API, hooks, pages, components)

---

## Design de Implementação

### Interfaces Principais

```csharp
// Domain — Repository interfaces
public interface ICaptacaoRepository
{
    Task<Captacao?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IEnumerable<Captacao> Items, int Total)> ListarAsync(ListarCaptacoesQuery filtro, CancellationToken ct);
    Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct);
    Task<int> ContarExecucoesAsync(Guid captacaoId, CancellationToken ct);
    Task AddAsync(Captacao captacao, CancellationToken ct);
    Task RemoveAsync(Captacao captacao, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

public interface IRubricaRepository
{
    Task<IEnumerable<Rubrica>> ListarAsync(CancellationToken ct);
    Task<Rubrica?> GetByIdAsync(Guid id, CancellationToken ct);
}

// Application — CQRS (reutilizar mesmas interfaces do Cadastro)
public interface ICommand<TResult> { }
public interface ICommandHandler<in TCommand, TResult> where TCommand : ICommand<TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct);
}
public interface IQuery<TResult> { }
public interface IQueryHandler<in TQuery, TResult> where TQuery : IQuery<TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct);
}
public interface IDispatcher
{
    Task<TResult> QueryAsync<TResult>(IQuery<TResult> query, CancellationToken ct);
    Task<TResult> SendAsync<TResult>(ICommand<TResult> command, CancellationToken ct);
}
```

### Modelos de Dados

#### Entidade: Captação (Aggregate Root)

```csharp
public class Captacao
{
    public Guid Id { get; private set; }
    public Guid RubricaId { get; private set; }
    public Rubrica Rubrica { get; private set; }
    public DateOnly Periodo { get; private set; }
    public string UsuarioDeMusica { get; private set; }
    public StatusCaptacao Status { get; private set; }
    public Guid AnalistaResponsavelId { get; private set; }
    public string AnalistaResponsavelNome { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    private Captacao() { } // EF Core

    public static Captacao Criar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica,
        Guid analistaId, string analistaNome) => new()
    {
        Id = Guid.NewGuid(),
        RubricaId = rubricaId,
        Periodo = periodo,
        UsuarioDeMusica = usuarioDeMusica,
        Status = StatusCaptacao.Aberta,
        AnalistaResponsavelId = analistaId,
        AnalistaResponsavelNome = analistaNome,
        CriadoEm = DateTime.UtcNow,
        AtualizadoEm = DateTime.UtcNow
    };

    public void Atualizar(Guid rubricaId, DateOnly periodo, string usuarioDeMusica)
    {
        if (Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações com status ABERTA podem ser editadas.");
        RubricaId = rubricaId;
        Periodo = periodo;
        UsuarioDeMusica = usuarioDeMusica;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void ValidarPropriedade(Guid analistaId)
    {
        if (AnalistaResponsavelId != analistaId)
            throw new ForbiddenException("Apenas o analista responsável pode modificar esta captação.");
    }

    public void ValidarAberta()
    {
        if (Status != StatusCaptacao.Aberta)
            throw new DomainException("Apenas captações com status ABERTA podem ser modificadas.");
    }
}
```

#### Entidade: Rubrica (Seed)

```csharp
public class Rubrica
{
    public Guid Id { get; private set; }
    public string Sigla { get; private set; }
    public string Nome { get; private set; }
    public bool ExigeClassificacao { get; private set; }

    private Rubrica() { }

    public static Rubrica Criar(Guid id, string sigla, string nome, bool exigeClassificacao) => new()
    {
        Id = id, Sigla = sigla, Nome = nome, ExigeClassificacao = exigeClassificacao
    };
}
```

#### Enums

```csharp
public enum StatusCaptacao
{
    Aberta,
    Fechada,
    Cancelada
}
```

#### Schema PostgreSQL (`identificacao`)

```sql
CREATE SCHEMA IF NOT EXISTS identificacao;

CREATE TABLE identificacao.rubricas (
    "Id"                   UUID PRIMARY KEY,
    "Sigla"                VARCHAR(20) NOT NULL UNIQUE,
    "Nome"                 VARCHAR(100) NOT NULL,
    "ExigeClassificacao"   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE identificacao.captacoes (
    "Id"                       UUID PRIMARY KEY,
    "RubricaId"                UUID NOT NULL REFERENCES identificacao.rubricas("Id"),
    "Periodo"                  DATE NOT NULL,
    "UsuarioDeMusica"          VARCHAR(255) NOT NULL,
    "Status"                   VARCHAR(20) NOT NULL DEFAULT 'Aberta',
    "AnalistaResponsavelId"    UUID NOT NULL,
    "AnalistaResponsavelNome"  VARCHAR(200) NOT NULL,
    "CriadoEm"                TIMESTAMP WITH TIME ZONE NOT NULL,
    "AtualizadoEm"             TIMESTAMP WITH TIME ZONE NOT NULL
);

-- RN-01: Unicidade rubrica+período para captações não canceladas
CREATE UNIQUE INDEX uq_captacoes_rubrica_periodo_ativa
    ON identificacao.captacoes ("RubricaId", "Periodo")
    WHERE "Status" != 'Cancelada';
```

### Endpoints de API

Conforme `api-contract.yaml`:

| Método | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/api/v1/rubricas` | `ListarRubricasQueryHandler` | read |
| GET | `/api/v1/captacoes` | `ListarCaptacoesQueryHandler` | read |
| POST | `/api/v1/captacoes` | `CriarCaptacaoCommandHandler` | write |
| GET | `/api/v1/captacoes/{id}` | `GetCaptacaoByIdQueryHandler` | read |
| PUT | `/api/v1/captacoes/{id}` | `AtualizarCaptacaoCommandHandler` | write |
| DELETE | `/api/v1/captacoes/{id}` | `ExcluirCaptacaoCommandHandler` | write |

### CQRS — Commands & Queries

**Commands:**
```csharp
public record CriarCaptacaoCommand(Guid RubricaId, DateOnly Periodo, string UsuarioDeMusica)
    : ICommand<CaptacaoResponse>;

public record AtualizarCaptacaoCommand(Guid Id, Guid RubricaId, DateOnly Periodo, string UsuarioDeMusica)
    : ICommand<CaptacaoResponse>;

public record ExcluirCaptacaoCommand(Guid Id) : ICommand<Unit>;
```

**Queries:**
```csharp
public record ListarRubricasQuery() : IQuery<RubricaListResponse>;

public record ListarCaptacoesQuery(
    int Page = 1, int Size = 20,
    Guid? RubricaId = null, DateOnly? PeriodoInicio = null, DateOnly? PeriodoFim = null,
    string? Status = null, Guid? AnalistaResponsavelId = null, string Sort = "-periodo"
) : IQuery<CaptacaoListResponse>;

public record GetCaptacaoByIdQuery(Guid Id) : IQuery<CaptacaoDetalheResponse>;
```

**Validators (FluentValidation):**
```csharp
public class CriarCaptacaoCommandValidator : AbstractValidator<CriarCaptacaoCommand>
{
    public CriarCaptacaoCommandValidator()
    {
        RuleFor(x => x.RubricaId).NotEmpty();
        RuleFor(x => x.Periodo).NotEmpty();
        RuleFor(x => x.UsuarioDeMusica).NotEmpty().MaximumLength(255);
    }
}
```

### Mapeamento de Regras de Negócio

| Regra | Camada | Implementação |
|-------|--------|---------------|
| RN-01 — unicidade rubrica+período | Infra (DB) + Application | Partial unique index + verificação no handler antes de salvar |
| RN-07 — período manual | Application | Campo `DateOnly` no command, sem derivação automática |
| RN-08 — propriedade do analista | Domain + Application | `Captacao.ValidarPropriedade(analistaId)` extraído do JWT |
| Rubrica bloqueada com execuções | Application | Handler consulta `ContarExecucoesAsync()` antes de permitir alteração de rubrica |

### Extração do Analista do JWT

```csharp
// No endpoint, extrair do HttpContext
var analistaId = Guid.Parse(context.User.FindFirst("sub")?.Value!);
var analistaNome = context.User.FindFirst("name")?.Value ?? "Desconhecido";
```

---

## Inventário de Artefatos

### Arquivos a Criar

**Backend — Solution & Projects**

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/Identificacao.sln` | Solution | Solution .NET para o serviço de Identificação |
| `services/identificacao-api/1-Services/Identificacao.API/Identificacao.API.csproj` | Project | Projeto da camada de apresentação (Minimal API) |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Entrypoint | Configuração de serviços, middleware, EF Core, auth, CORS |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` | Endpoint | Rotas CRUD de captações |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/RubricaEndpoints.cs` | Endpoint | Rota GET de rubricas |
| `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/GlobalExceptionHandler.cs` | Middleware | Mapeia exceções de domínio para ProblemDetails |
| `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/KeycloakClaimsTransformation.cs` | Middleware | Extração de claims do JWT Keycloak |
| `services/identificacao-api/2-Application/Identificacao.Application/Identificacao.Application.csproj` | Project | Projeto da camada de aplicação |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/ICommand.cs` | Interface | Interface marker para commands |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/ICommandHandler.cs` | Interface | Handler de commands |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/IQuery.cs` | Interface | Interface marker para queries |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/IQueryHandler.cs` | Interface | Handler de queries |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/IDispatcher.cs` | Interface | Dispatcher CQRS |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/Dispatcher.cs` | Service | Implementação do Dispatcher via reflection + DI |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/Unit.cs` | Type | Tipo de retorno para commands sem resultado |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/NotFoundException.cs` | Exception | Recurso não encontrado (404) |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/ConflictException.cs` | Exception | Violação de regra de negócio (409) |
| `services/identificacao-api/2-Application/Identificacao.Application/Common/Exceptions/ForbiddenException.cs` | Exception | Sem permissão (403) |
| `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Queries/ListarRubricasQuery.cs` | Query | Listar rubricas |
| `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Queries/ListarRubricasQueryHandler.cs` | Handler | Handler de listagem de rubricas |
| `services/identificacao-api/2-Application/Identificacao.Application/Rubricas/Responses/RubricaResponse.cs` | DTO | Response de rubrica |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/CriarCaptacaoCommand.cs` | Command | Criar captação + validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/CriarCaptacaoCommandHandler.cs` | Handler | Handler de criação (RN-01, RN-07, RN-08) |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/AtualizarCaptacaoCommand.cs` | Command | Atualizar captação + validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/AtualizarCaptacaoCommandHandler.cs` | Handler | Handler de atualização (RN-01, RN-08, rubrica bloqueada) |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/ExcluirCaptacaoCommand.cs` | Command | Excluir captação |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Commands/ExcluirCaptacaoCommandHandler.cs` | Handler | Handler de exclusão (RN-08, somente ABERTA) |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/ListarCaptacoesQuery.cs` | Query | Listar captações com filtros e paginação |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/ListarCaptacoesQueryHandler.cs` | Handler | Handler de listagem |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQuery.cs` | Query | Buscar captação por ID |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQueryHandler.cs` | Handler | Handler de detalhe (com resumo de execuções) |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Responses/CaptacaoResponse.cs` | DTO | Response de captação (listagem) |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Responses/CaptacaoDetalheResponse.cs` | DTO | Response com resumo de execuções (detalhe) |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Identificacao.Domain.csproj` | Project | Projeto da camada de domínio |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` | Entity | Aggregate root — factory, validações, state machine |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Rubrica.cs` | Entity | Entidade de seed — sigla, nome, exigeClassificacao |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusCaptacao.cs` | Enum | Aberta, Fechada, Cancelada |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ICaptacaoRepository.cs` | Interface | Contrato do repositório de captações |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IRubricaRepository.cs` | Interface | Contrato do repositório de rubricas |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Exceptions/DomainException.cs` | Exception | Exceção de regra de domínio |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Identificacao.Infra.csproj` | Project | Projeto da camada de infraestrutura |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` | DbContext | Schema `identificacao`, DbSets de Captacao e Rubrica |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs` | Config | Fluent API: índice parcial de unicidade, FK para Rubrica |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/RubricaConfiguration.cs` | Config | Fluent API: unique index em Sigla |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Migrations/XXXX_InitialCreate.cs` | Migration | Schema + tabelas rubricas e captacoes |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/RubricaSeed.cs` | Seed | 7 rubricas com IDs fixos |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs` | Repository | Implementação com EF Core (filtros, paginação, sort) |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/RubricaRepository.cs` | Repository | Implementação read-only |

**Backend — Testes**

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/5-Tests/Identificacao.Tests/Identificacao.Tests.csproj` | Project | Projeto de testes |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/CaptacaoTests.cs` | Teste unitário | Factory, validações de propriedade, estado |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarCaptacaoCommandHandlerTests.cs` | Teste unitário | Criação com unicidade (RN-01) |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/AtualizarCaptacaoCommandHandlerTests.cs` | Teste unitário | Atualização com bloqueio de rubrica |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ExcluirCaptacaoCommandHandlerTests.cs` | Teste unitário | Exclusão somente ABERTA |

**Frontend**

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/features/identificacao/index.tsx` | Router | Rotas do módulo Identificação |
| `frontend/src/features/identificacao/captacoes/api/captacoesApi.ts` | API | Chamadas HTTP para captações e rubricas |
| `frontend/src/features/identificacao/captacoes/types/captacao.ts` | Types | Interfaces TypeScript derivadas do API contract |
| `frontend/src/features/identificacao/captacoes/hooks/useCaptacoes.ts` | Hook | useQuery para listagem com filtros |
| `frontend/src/features/identificacao/captacoes/hooks/useCaptacao.ts` | Hook | useQuery para detalhe |
| `frontend/src/features/identificacao/captacoes/hooks/useRubricas.ts` | Hook | useQuery para dropdown de rubricas (cache longo) |
| `frontend/src/features/identificacao/captacoes/hooks/useCreateCaptacao.ts` | Hook | useMutation para POST |
| `frontend/src/features/identificacao/captacoes/hooks/useUpdateCaptacao.ts` | Hook | useMutation para PUT |
| `frontend/src/features/identificacao/captacoes/hooks/useDeleteCaptacao.ts` | Hook | useMutation para DELETE |
| `frontend/src/features/identificacao/captacoes/pages/CaptacoesPage.tsx` | Page | Listagem com filtros e tabela |
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoDetailPage.tsx` | Page | Detalhe com resumo de execuções |
| `frontend/src/features/identificacao/captacoes/pages/CaptacaoCreatePage.tsx` | Page | Formulário de criação |
| `frontend/src/features/identificacao/captacoes/components/CaptacoesTable.tsx` | Component | Tabela com colunas, sort e ações |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoForm.tsx` | Component | Formulário reutilizado para criação/edição |
| `frontend/src/features/identificacao/captacoes/components/CaptacaoFilters.tsx` | Component | Filtros: rubrica, período, status, responsável |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `frontend/src/app/router/routes.tsx` | Adicionar rota `/identificacao/*` com lazy loading |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Adicionar link "Identificação > Captações" na navegação |
| `frontend/src/shared/components/layout/header/Header.tsx` | Adicionar item "Identificação" no menu principal |
| `frontend/src/shared/config/env.ts` | Adicionar `VITE_IDENTIFICACAO_API_BASE_URL` |
| `frontend/.env.example` | Documentar nova variável de ambiente |
| `docker-compose.dev.yml` | Não necessário — usa o mesmo PostgreSQL, schema diferente |
| `services/identificacao-api/.env.example` | Criar com variáveis de ambiente do serviço |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Referência de configuração de serviços, auth, CORS |
| `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/GlobalExceptionHandler.cs` | Referência de mapeamento exceção → ProblemDetails |
| `services/cadastro-api/1-Services/Cadastro.API/Infrastructure/KeycloakClaimsTransformation.cs` | Referência de extração de claims |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/Dispatcher.cs` | Referência da implementação do Dispatcher |
| `services/cadastro-api/2-Application/Cadastro.Application/Obras/Queries/ListarObrasQueryHandler.cs` | Referência de padrão de query com paginação e filtros |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` | Referência de configuração do DbContext |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` | Referência de padrão de repositório (filtros, sort, paginação) |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` | Referência de padrão de seed |
| `frontend/src/features/cadastro/obras/` | Referência completa do padrão frontend (api, hooks, pages, components) |

---

## Pontos de Integração

### Autenticação (Keycloak)

- Mesma instância Keycloak do Cadastro
- Novas roles: `analista-identificacao` (write), `consultor-identificacao` (read)
- Policies: `read` → ambas roles, `write` → apenas analista
- Claims usadas: `sub` (ID do analista), `name` (nome do analista)
- Variável `AUTH_ENABLED` para toggle em dev

### Banco de Dados (PostgreSQL)

- Mesmo servidor PostgreSQL (`mcad-postgres`)
- Schema isolado: `identificacao` (não faz JOIN com schema `cadastro`)
- Connection string separada com `Search Path=identificacao`
- Migrations via EF Core, executadas no startup

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| Frontend — Router | Adição de rota | Nova rota `/identificacao/*`. Baixo risco. | Lazy loading para não impactar bundle do Cadastro |
| Frontend — Sidebar/Header | Adição de item | Novo link de navegação. Baixo risco. | Manter consistência visual |
| PostgreSQL | Novo schema | Schema `identificacao` isolado. Sem impacto no schema `cadastro`. | Verificar grants de usuário |
| Keycloak | Novas roles | `analista-identificacao`, `consultor-identificacao`. Sem impacto nas roles existentes. | Configurar no realm |
| Domínio Distribuição (futuro) | Preparação | A entidade Captação será fonte do evento `identificacao.rol.fechado` em F05. Nenhum impacto agora. | Design do campo `Status` já prevê transição para Fechada |

---

## Abordagem de Testes

### Testes Unitários (Domain + Application)

| Cenário | Arquivo | Regra |
|---------|---------|-------|
| Criar captação com dados válidos | `CaptacaoTests.cs` | Factory |
| Atualizar captação ABERTA | `CaptacaoTests.cs` | Estado |
| Rejeitar atualização de captação FECHADA | `CaptacaoTests.cs` | Estado |
| Rejeitar edição por analista não-dono | `CaptacaoTests.cs` | RN-08 |
| Rejeitar criação com rubrica+período duplicado | `CriarCaptacaoCommandHandlerTests.cs` | RN-01 |
| Rejeitar alteração de rubrica com execuções | `AtualizarCaptacaoCommandHandlerTests.cs` | RF-04.5 |
| Rejeitar exclusão de captação FECHADA | `ExcluirCaptacaoCommandHandlerTests.cs` | RF-05.4 |

### Testes de Integração (a criar em features futuras)

Quando F02-F04 forem implementados, adicionar testes de integração que validem o fluxo completo: criação → registro de execuções → contagem no resumo.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Solution + projetos + referências** — estrutura base do .NET
2. **Domain** — entidades Captacao, Rubrica, enum StatusCaptacao, interfaces de repositório
3. **Infra** — DbContext, configurations, migration inicial, seed de rubricas, repositórios
4. **Application** — CQRS infra (dispatcher, interfaces), commands, queries, validators, responses
5. **API** — Program.cs, endpoints, exception handler, auth
6. **Testes unitários** — domain + application handlers
7. **Frontend — types + api + hooks** — tipos, chamadas HTTP, React Query hooks
8. **Frontend — pages + components** — listagem, detalhe, formulário, filtros
9. **Frontend — routing + navegação** — integrar no router e sidebar

### Dependências Técnicas

- PostgreSQL 16 (já disponível via `docker-compose.dev.yml`)
- Keycloak com roles `analista-identificacao` e `consultor-identificacao` configuradas
- .NET 8 SDK instalado
- Node.js para o frontend

---

## Monitoramento e Observabilidade

- **Health check:** `/health` endpoint (AllowAnonymous), mesmo padrão do Cadastro
- **Logs:** structured logging via `ILogger<T>` — nível INFO para operações, WARN para conflitos de unicidade, ERROR para exceções não tratadas
- **Métricas futuras:** quando Outbox Pattern for adicionado (F05/F06), adicionar métricas de eventos publicados

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Serviço separado vs. módulo no Cadastro | Serviço separado | Schema-per-Service, bounded context isolado, deploy independente |
| Copiar CQRS infra vs. shared library | Copiar | Evita acoplamento entre serviços na PoC; pode ser extraído depois |
| DateOnly vs. DateTime para período | DateOnly | Período é diário, sem componente de hora |
| Analista no JWT vs. tabela local | JWT (sub + name) | Evita sincronização de usuários; dados suficientes para a feature |
| Partial unique index para RN-01 | Sim | Garantia no nível do banco — à prova de race conditions |

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Partial unique index pode não funcionar com EF Core migrations | Criar migration manual com SQL raw se necessário |
| Campo `resumoExecucoes` retorna zeros até F02/F03 ser implementado | Aceitável — detalhe mostrará contadores zerados corretamente |
| Nome do analista no JWT pode mudar (rename no Keycloak) | `AtualizadoEm` reflete último update; nome é snapshot no momento da criação |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Antes de implementar qualquer tela do frontend, é obrigatório gerar mockups no Stitch para validação visual. Os mockups devem ser criados no projeto acima e aprovados antes de iniciar a implementação dos componentes React.

**Telas a desenhar:**
1. Listagem de Captações (com filtros e tabela)
2. Detalhe de Captação (com resumo de execuções)
3. Formulário de Criação/Edição de Captação
4. Dialog de confirmação de exclusão

---

*TechSpec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo e o PRD como contexto.*
