# Tech Spec — F01: Seed de Associações

> **PRD:** `tasks/prd-seed-associacoes/prd.md`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F01
> **Data:** 2026-03-29

---

## Resumo Executivo

Esta Tech Spec cobre a implementação da primeira feature do domínio Cadastro: seed das 7 associações de gestão coletiva do ECAD. Por ser a primeira feature do projeto, também estabelece a **fundação do serviço cadastro-api** — estrutura de projeto .NET 8 com Clean Architecture, schema PostgreSQL isolado, EF Core Migrations e API read-only.

A feature é deliberadamente simples em lógica de negócio (dados estáticos read-only), mas estruturalmente importante: define os padrões que todas as features subsequentes seguirão.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Clean Architecture com camadas numeradas, CQRS nativo, Repository Pattern, tratamento de erros |
| `dotnet-dependency-config` | Pacotes NuGet, EF Core com PostgreSQL, FluentValidation |
| `dotnet-code-quality` | Convenções de nomenclatura, padrões de código |
| `common/restful-api` | Padrões de API REST, versionamento via path |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
services/cadastro-api/
├── Cadastro.sln
├── 1-Services/
│   └── Cadastro.API/                  ← ASP.NET Core 8 Minimal API
├── 2-Application/
│   └── Cadastro.Application/          ← Queries CQRS, DTOs, Mappers
├── 3-Domain/
│   └── Cadastro.Domain/               ← Entidade Associacao, Interfaces
├── 4-Infra/
│   └── Cadastro.Infra/                ← EF Core DbContext, Repository, Migrations, Seed
└── 5-Tests/
    ├── Cadastro.UnitTests/
    └── Cadastro.IntegrationTests/
```

**Fluxo de dados (F01):**
```
Browser → React SPA → GET /api/v1/associacoes → Cadastro.API
    → Dispatcher → GetAssociacoesQueryHandler
    → IAssociacaoRepository (read-only)
    → EF Core (AsNoTracking) → PostgreSQL schema "cadastro"
    → AssociacaoResponse[] → JSON
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Clean Architecture com camadas numeradas | Padrão da skill `dotnet-architecture`; facilita onboarding e consistência entre serviços |
| CQRS nativo (sem MediatR) | Apenas Queries nesta feature (read-only); padrão do projeto conforme skill |
| EF Core Migrations para seed | Dados das associações versionados junto com o schema; idempotente por natureza |
| Schema isolado `cadastro` no PostgreSQL | Schema-per-Service conforme Vision Doc |
| API versionada via path (`/api/v1/`) | Padrão RESTful; permite evolução sem quebra |
| Sem endpoints de escrita | RF-04 e RF-10 do PRD — dados são imutáveis |

---

## Design de Implementação

### Interfaces Principais

```csharp
// 3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs
public interface IAssociacaoRepository
{
    Task<IEnumerable<Associacao>> GetAllAsync(CancellationToken cancellationToken);
    Task<Associacao?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}
```

```csharp
// 2-Application — CQRS Query
public record GetAssociacoesQuery() : IQuery<IEnumerable<AssociacaoResponse>>;
public record GetAssociacaoByIdQuery(Guid Id) : IQuery<AssociacaoResponse>;

public record AssociacaoResponse(Guid Id, string Sigla, string Nome, string Cnpj);
```

### Modelos de Dados

#### Entidade de Domínio

```csharp
// 3-Domain/Cadastro.Domain/Entities/Associacao.cs
public class Associacao
{
    public Guid Id { get; private set; }
    public string Nome { get; private set; }
    public string Sigla { get; private set; }
    public string Cnpj { get; private set; }

    private Associacao() { } // EF Core

    public Associacao(Guid id, string nome, string sigla, string cnpj)
    {
        Id = id;
        Nome = nome;
        Sigla = sigla;
        Cnpj = cnpj;
    }
}
```

#### Schema PostgreSQL

```sql
-- Schema: cadastro
-- Tabela: associacoes

CREATE TABLE cadastro.associacoes (
    id          UUID            PRIMARY KEY,
    nome        VARCHAR(200)    NOT NULL,
    sigla       VARCHAR(20)     NOT NULL,
    cnpj        CHAR(18)        NOT NULL,  -- formato XX.XXX.XXX/XXXX-XX
    CONSTRAINT uq_associacoes_sigla UNIQUE (sigla),
    CONSTRAINT uq_associacoes_cnpj  UNIQUE (cnpj)
);
```

#### Dados do Seed

| Id (UUID v4) | Sigla | Nome | CNPJ |
|---|---|---|---|
| (gerado) | ABRAMUS | Associação Brasileira de Música e Artes | 50.997.063/0001-32 |
| (gerado) | AMAR | Associação de Músicos, Arranjadores e Regentes | 30.713.325/0001-82 |
| (gerado) | ASSIM | Associação de Intérpretes e Músicos | 43.985.563/0001-99 |
| (gerado) | SBACEM | Sociedade Brasileira de Autores, Compositores e Escritores de Música | 33.780.222/0001-23 |
| (gerado) | SICAM | Sociedade Independente de Compositores e Autores Musicais | 62.092.010/0001-51 |
| (gerado) | SOCINPRO | Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais | 33.748.146/0001-79 |
| (gerado) | UBC | União Brasileira de Compositores | 33.576.166/0001-00 |

> **Nota:** UUIDs serão determinísticos (hardcoded no seed) para garantir idempotência e referência estável entre serviços.

### Endpoints de API

| Método | Path | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/v1/associacoes` | Lista todas as associações | `200` — `AssociacaoResponse[]` |
| `GET` | `/api/v1/associacoes/{id}` | Busca associação por ID | `200` — `AssociacaoResponse` / `404` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/associacoes/**` | Bloqueado | `405 Method Not Allowed` |

**Response body (GET lista):**
```json
[
  {
    "id": "...",
    "sigla": "ABRAMUS",
    "nome": "Associação Brasileira de Música e Artes",
    "cnpj": "50.997.063/0001-32"
  }
]
```

**Response body (GET por ID — não encontrado):**
```json
{
  "status": 404,
  "title": "Resource Not Found",
  "detail": "Associação with ID '...' was not found",
  "instance": "/api/v1/associacoes/..."
}
```

---

## Scripts de Banco de Dados

### Script 1 — Criação de Database (executar como superuser)

```sql
-- scripts/00-create-database.sql
-- Executar apenas se o database ainda não existir
CREATE DATABASE mcad
    WITH ENCODING = 'UTF8'
         LC_COLLATE = 'pt_BR.UTF-8'
         LC_CTYPE = 'pt_BR.UTF-8';
```

### Script 2 — Criação de Schema, Usuário e Grants

```sql
-- scripts/01-setup-cadastro-schema.sql
-- Executar conectado ao database mcad como superuser

-- 1. Criar schema isolado para o domínio Cadastro
CREATE SCHEMA IF NOT EXISTS cadastro;

-- 2. Criar usuário dedicado ao serviço (sem acesso cross-schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'cadastro_svc') THEN
        CREATE ROLE cadastro_svc WITH LOGIN PASSWORD 'CHANGE_ME';
    END IF;
END
$$;

-- 3. Grants — acesso restrito ao schema cadastro
GRANT USAGE ON SCHEMA cadastro TO cadastro_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cadastro_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA cadastro TO cadastro_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA cadastro
    GRANT USAGE, SELECT ON SEQUENCES TO cadastro_svc;

-- 4. Revogar acesso a outros schemas
REVOKE ALL ON SCHEMA public FROM cadastro_svc;
```

> **Nota:** O password `CHANGE_ME` deve ser substituído pelo valor real. O `.env` do serviço apontará para este usuário.

---

## Configuração de Ambiente

### .env (raiz do serviço)

```env
# Database
CADASTRO_DB_HOST=
CADASTRO_DB_PORT=5432
CADASTRO_DB_NAME=mcad
CADASTRO_DB_SCHEMA=cadastro
CADASTRO_DB_USER=cadastro_svc
CADASTRO_DB_PASSWORD=

# API
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://+:5001
```

### Connection String (construída a partir do .env)

```
Host={CADASTRO_DB_HOST};Port={CADASTRO_DB_PORT};Database={CADASTRO_DB_NAME};Username={CADASTRO_DB_USER};Password={CADASTRO_DB_PASSWORD};Search Path={CADASTRO_DB_SCHEMA}
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/cadastro-api/Cadastro.sln` | Solution | Solution .NET |
| `services/cadastro-api/.env.example` | Config | Template de variáveis de ambiente |
| `services/cadastro-api/.gitignore` | Config | Gitignore para .NET |
| **1-Services (API)** | | |
| `services/cadastro-api/1-Services/Cadastro.API/Cadastro.API.csproj` | Projeto | ASP.NET Core 8 Web API |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Startup | Configuração DI, middleware, rotas |
| `services/cadastro-api/1-Services/Cadastro.API/Endpoints/AssociacaoEndpoints.cs` | Endpoint | Minimal API endpoints GET + bloqueio 405 |
| `services/cadastro-api/1-Services/Cadastro.API/appsettings.json` | Config | Configuração base da API |
| `services/cadastro-api/1-Services/Cadastro.API/appsettings.Development.json` | Config | Configuração dev |
| **2-Application** | | |
| `services/cadastro-api/2-Application/Cadastro.Application/Cadastro.Application.csproj` | Projeto | Class Library |
| `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacoesQuery.cs` | Query | CQRS Query — listar todas |
| `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacoesQueryHandler.cs` | Handler | Handler da query de listagem |
| `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacaoByIdQuery.cs` | Query | CQRS Query — buscar por ID |
| `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Queries/GetAssociacaoByIdQueryHandler.cs` | Handler | Handler da query por ID |
| `services/cadastro-api/2-Application/Cadastro.Application/Associacoes/Responses/AssociacaoResponse.cs` | DTO | Response DTO |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQuery.cs` | Interface | Interface base IQuery<T> |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IQueryHandler.cs` | Interface | Interface base IQueryHandler<T,R> |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/ICommand.cs` | Interface | Interface base ICommand<T> (para features futuras) |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/ICommandHandler.cs` | Interface | Interface base ICommandHandler<T,R> |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/IDispatcher.cs` | Interface | Interface do Dispatcher |
| `services/cadastro-api/2-Application/Cadastro.Application/Common/CQRS/Dispatcher.cs` | Serviço | Implementação do Dispatcher nativo |
| **3-Domain** | | |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Cadastro.Domain.csproj` | Projeto | Class Library (zero dependências externas) |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs` | Entidade | Entidade de domínio Associacao |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs` | Interface | Contrato do repositório read-only |
| **4-Infra** | | |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Cadastro.Infra.csproj` | Projeto | Class Library com EF Core |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` | DbContext | EF Core DbContext com schema "cadastro" |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/AssociacaoConfiguration.cs` | Config EF | Fluent API — mapeamento da entidade |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_InitialCreate.cs` | Migration | Criação da tabela associacoes |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` | Seed | HasData com as 7 associações (UUIDs fixos) |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/AssociacaoRepository.cs` | Repository | Implementação read-only com AsNoTracking |
| **5-Tests** | | |
| `services/cadastro-api/5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj` | Projeto | xUnit |
| `services/cadastro-api/5-Tests/Cadastro.UnitTests/Associacoes/GetAssociacoesQueryHandlerTests.cs` | Teste | Testes unitários do handler de listagem |
| `services/cadastro-api/5-Tests/Cadastro.UnitTests/Associacoes/GetAssociacaoByIdQueryHandlerTests.cs` | Teste | Testes unitários do handler por ID |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj` | Projeto | xUnit + Testcontainers |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AssociacaoEndpointsTests.cs` | Teste | Testes de integração dos endpoints |
| **Scripts SQL** | | |
| `scripts/00-create-database.sql` | SQL | Criação do database mcad |
| `scripts/01-setup-cadastro-schema.sql` | SQL | Schema, usuário, grants |

### Arquivos a Modificar

Nenhum — projeto greenfield.

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `vision.md` | Restrições globais, glossário, stack |
| `domains/cadastro/domain.md` | Entidades, regras RN-XX, eventos |
| `tasks/prd-seed-associacoes/prd.md` | Requisitos funcionais RF-01 a RF-10 |

---

## Pontos de Integração

Nenhuma integração externa nesta feature. O serviço é auto-contido.

**Integração futura (F02+):** O endpoint `GET /api/v1/associacoes` será consumido pela tela de cadastro de titulares como dropdown de seleção.

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| Schema PostgreSQL | Novo schema `cadastro` | Primeiro schema do projeto. Baixo risco. | Executar scripts SQL antes do primeiro deploy |
| Features F02-F08 | Dependência estrutural | Todas as features do Cadastro herdam a estrutura de projeto criada aqui | Garantir que a fundação (CQRS, Repository, DbContext) esteja sólida |
| Domínios D02-D04 (Vision Doc) | Referência de padrão | Outros serviços seguirão a mesma estrutura. Decisões aqui viram precedente. | Documentar decisões como padrão |

---

## Abordagem de Testes

### Testes Unitários

- **GetAssociacoesQueryHandler** — mock do `IAssociacaoRepository`, verificar que retorna todas as associações mapeadas para `AssociacaoResponse`
- **GetAssociacaoByIdQueryHandler** — mock do repositório; cenário encontrado (retorna DTO) e não encontrado (lança exception)
- **Entidade Associacao** — construtor valida argumentos não-nulos

### Testes de Integração

- **GET /api/v1/associacoes** — WebApplicationFactory com Testcontainers PostgreSQL; verificar 7 registros retornados com dados corretos
- **GET /api/v1/associacoes/{id}** — verificar retorno 200 com ID válido, 404 com ID inexistente
- **POST /api/v1/associacoes** — verificar retorno 405 Method Not Allowed
- **Seed idempotência** — iniciar aplicação duas vezes, verificar que continuam 7 registros

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Scripts SQL** — database, schema, usuário, grants (pré-requisito de infra)
2. **Solution + projetos** — estrutura de pastas, .csproj, referências, .env
3. **Domain** — entidade `Associacao`, interface `IAssociacaoRepository`
4. **Infra** — DbContext, Configuration, Migration com seed, Repository
5. **Application** — CQRS interfaces, Queries, Handlers, DTOs
6. **API** — Program.cs (DI, middleware), Endpoints (GET + bloqueio 405)
7. **Testes unitários** — handlers
8. **Testes de integração** — endpoints com Testcontainers

### Dependências Técnicas

- PostgreSQL acessível (banco externo — configuração via .env)
- .NET 8 SDK instalado
- Docker (apenas para Testcontainers nos testes de integração)

---

## Monitoramento e Observabilidade

### Logging

- Log estruturado (JSON) via `Microsoft.Extensions.Logging`
- Log de startup: confirmação de seed executado e quantidade de associações
- Log de request: método, path, status code, duração
- Correlation ID via `HttpContext.TraceIdentifier`

### Health Check

- Endpoint `GET /health` — verifica conectividade com PostgreSQL
- Será base para health checks de features futuras

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Alternativas Consideradas | Justificativa |
|---------|--------------------------|---------------|
| UUIDs determinísticos no seed | Auto-increment, UUIDs aleatórios | Garante idempotência e referência estável cross-service |
| Minimal API (não Controllers) | Controllers tradicionais | Menos boilerplate para PoC; padrão .NET 8 |
| `HasData` no EF Core para seed | Seed no startup via código, SQL insert | Versionado junto com migrations; idempotente por design do EF Core |
| Schema separado (`cadastro`) | Schema `public`, database separado | Schema-per-Service conforme Vision Doc; compartilha database `mcad` |
| AsNoTracking em todas as queries | Tracking padrão | Feature 100% read-only; melhor performance |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Collation `pt_BR.UTF-8` pode não estar disponível no PostgreSQL do ambiente | Script SQL com fallback para `en_US.UTF-8`; documentar pré-requisito |
| Primeira migration define padrões que serão herdados | Code review criterioso nesta feature |

### Conformidade com Padrões

- [x] Clean Architecture com camadas numeradas (skill `dotnet-architecture`)
- [x] CQRS nativo sem MediatR (skill `dotnet-architecture`)
- [x] Repository Pattern com EF Core (skill `dotnet-architecture`)
- [x] Tratamento de erros com ProblemDetails (skill `dotnet-architecture`)
- [x] Schema-per-Service (Vision Doc)
- [x] API versionada via path (skill `common/restful-api`)
- [x] Precisão decimal como convenção desde o início (RN-08 do Domain Doc)

### Mapeamento de Regras de Negócio para Implementação

| Regra | Camada | Implementação |
|-------|--------|---------------|
| RF-01 (7 associações no startup) | Infra (Seed) | `HasData` na migration com 7 registros |
| RF-02 (nome, sigla, CNPJ) | Domain (Entidade) | Propriedades na classe `Associacao` |
| RF-03 (seed idempotente) | Infra (Migration) | `HasData` do EF Core é idempotente por design |
| RF-04 (sem CRUD) | API (Endpoints) | Apenas GET mapeado; outros verbos retornam 405 |
| RF-05 (tela tabular) | Frontend (futuro) | Consumirá `GET /api/v1/associacoes` |
| RF-08 (API lista) | API + Application | Endpoint GET → Query → Handler → Repository |
| RF-09 (API por ID) | API + Application | Endpoint GET /{id} → Query → Handler → Repository |
| RF-10 (405 para escrita) | API (Endpoints) | `MapMethods` com 405 para POST/PUT/PATCH/DELETE |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*
