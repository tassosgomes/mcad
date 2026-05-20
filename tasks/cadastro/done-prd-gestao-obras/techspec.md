# Tech Spec — F03: Gestão de Obras Musicais

> **PRD:** `tasks/prd-gestao-obras/prd.md`
> **API Contract:** `tasks/prd-gestao-obras/api-contract.yaml`
> **Domínio:** Cadastro (D01)
> **Feature ID:** F03
> **Data:** 2026-03-30

---

## Resumo Executivo

Esta Tech Spec cobre a implementação do CRUD de Obras Musicais com dois mecanismos diferenciadores: **integração com API externa para obtenção de ISWC** e **depuração automática** de obras LIBERADAS que sofrem alteração de título ou titulares. Segue os padrões estabelecidos em F01/F02 (CQRS nativo, Clean Architecture, Repository Pattern) e introduz: `HttpClient` com Polly para chamadas externas, mecanismo de depuração transacional, e novo enum `StatusObra` com 5 estados.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `dotnet-architecture` | Clean Architecture, CQRS, Repository, entidades com factory methods |
| `dotnet-code-quality` | FluentValidation, error handling, ProblemDetails |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `dotnet-dependency-config` | HttpClient + Polly para API ISWC |
| `common/restful-api` | Sub-resources (/iswc, /depurar, /dominio-publico) |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
services/cadastro-api/
├── 1-Services/Cadastro.API/
│   └── Endpoints/ObraEndpoints.cs              ← 8 endpoints (CRUD + ISWC + depurar + DP)
├── 2-Application/Cadastro.Application/
│   └── Obras/
│       ├── Commands/
│       │   ├── CriarObraCommand.cs + Handler + Validator
│       │   ├── AtualizarObraCommand.cs + Handler + Validator
│       │   ├── ExcluirObraCommand.cs + Handler
│       │   ├── ObterIswcCommand.cs + Handler        ← Integração API externa
│       │   ├── DepurarObraCommand.cs + Handler       ← Depuração transacional
│       │   └── AlterarDominioPublicoCommand.cs + Handler
│       ├── Queries/
│       │   ├── ListarObrasQuery.cs + Handler
│       │   └── GetObraByIdQuery.cs + Handler
│       └── Responses/
│           ├── ObraResponse.cs
│           ├── ObraListResponse.cs
│           └── DepuracaoResponse.cs
├── 3-Domain/Cadastro.Domain/
│   ├── Entities/ObraMusical.cs                  ← Entidade com depuração
│   ├── Enums/StatusObra.cs
│   ├── Enums/TipoObra.cs
│   ├── Interfaces/IObraRepository.cs
│   └── Interfaces/IIswcService.cs               ← Abstração da API externa
├── 4-Infra/Cadastro.Infra/
│   ├── Data/Configurations/ObraMusicalConfiguration.cs
│   ├── Data/Migrations/XXXX_AddObras.cs
│   ├── Repositories/ObraRepository.cs
│   └── ExternalServices/IswcService.cs          ← HttpClient + Polly
└── 5-Tests/
    ├── Cadastro.UnitTests/Obras/
    └── Cadastro.IntegrationTests/ObraEndpointsTests.cs
```

### Fluxo de Dados — Obter ISWC

```
POST /api/v1/obras/{id}/iswc
  → ObraEndpoints → Dispatcher.SendAsync(ObterIswcCommand)
  → ObterIswcCommandHandler
    → IObraRepository.GetByIdAsync(id) [inclui titularidades]
    → Valida: status == PENDENTE, tem titulares autorais
    → Seleciona associação: titular com maior percentual (empate → primeiro)
    → IIswcService.ObterIswcAsync(titulo, autores[], associacao)
      → HttpClient POST https://iswc.tasso.dev.br/
      → Response: { iswc, work_title, authors, association_code }
    → Valida: ISWC não duplicado no banco
    → obra.AtribuirIswc(iswc)
    → SaveChangesAsync()
  → ObraResponse (com ISWC preenchido)
```

### Fluxo de Dados — Depuração

```
POST /api/v1/obras/{id}/depurar
  → DepurarObraCommandHandler (transacional)
    → IObraRepository.GetByIdAsync(id)
    → Valida: status == LIBERADO
    → obraOriginal.Depurar(novaObraId) → status = DEPURADA, obraDepuradaParaId = novaObraId
    → novaObra = ObraMusical.Criar(...) → status = PENDENTE, sem ISWC
    → IObraRepository.AddAsync(novaObra)
    → SaveChangesAsync() [ambas operações na mesma transação]
  → DepuracaoResponse { obraDepurada, novaObra }
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| `IIswcService` no Domain (interface), `IswcService` no Infra | Inversão de dependência — Domain não conhece HTTP |
| HttpClient + Polly (retry + timeout) | API externa pode falhar; Polly é o padrão .NET para resiliência |
| Depuração transacional (mesma SaveChanges) | Garantia de atomicidade: obra original + nova obra persistidas juntas |
| Status DEPURADA com `obraDepuradaParaId` | Rastreabilidade bidirecional — saber qual obra substituiu qual |
| PUT retorna 409 `DEPURACAO_NECESSARIA` | Frontend precisa confirmar com modal antes de depurar |
| Sub-resources para ações específicas | `/iswc`, `/depurar`, `/dominio-publico` são operações semânticas, não edição genérica |

---

## Design de Implementação

### Entidade ObraMusical (Domain Layer)

```csharp
public class ObraMusical
{
    public Guid Id { get; private set; }
    public string Titulo { get; private set; }
    public string? Subtitulo { get; private set; }
    public TipoObra Tipo { get; private set; }
    public string? Genero { get; private set; }
    public string? Iswc { get; private set; }
    public StatusObra Status { get; private set; }
    public bool DominioPublico { get; private set; }
    public Guid? ObraDepuradaParaId { get; private set; }  // FK → nova obra (se DEPURADA)
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    // Navigation
    public ObraMusical? ObraDepuradaPara { get; private set; }

    private ObraMusical() { } // EF Core

    public static ObraMusical Criar(string titulo, TipoObra tipo, string? subtitulo = null, string? genero = null)
    {
        return new ObraMusical
        {
            Id = Guid.NewGuid(),
            Titulo = titulo ?? throw new ArgumentNullException(nameof(titulo)),
            Subtitulo = subtitulo,
            Tipo = tipo,
            Genero = genero,
            Iswc = null,
            Status = StatusObra.Pendente,
            DominioPublico = false,
            ObraDepuradaParaId = null,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(string titulo, string? subtitulo, TipoObra tipo, string? genero)
    {
        if (Status == StatusObra.Depurada)
            throw new DomainException("Obras depuradas não podem ser editadas");
        if (Status == StatusObra.DominioPublico)
            throw new DomainException("Obras em Domínio Público não podem ser editadas");

        Titulo = titulo ?? throw new ArgumentNullException(nameof(titulo));
        Subtitulo = subtitulo;
        Tipo = tipo;
        Genero = genero;
        AtualizadoEm = DateTime.UtcNow;
    }

    public bool RequerDepuracao(string novoTitulo)
    {
        return Status == StatusObra.Liberado && Titulo != novoTitulo;
    }

    public void AtribuirIswc(string iswc)
    {
        if (Status != StatusObra.Pendente)
            throw new DomainException("ISWC só pode ser atribuído a obras PENDENTES");
        if (Iswc != null)
            throw new DomainException("Obra já possui ISWC");
        Iswc = iswc ?? throw new ArgumentNullException(nameof(iswc));
        AtualizadoEm = DateTime.UtcNow;
    }

    public void Depurar(Guid novaObraId)
    {
        if (Status != StatusObra.Liberado)
            throw new DomainException("Apenas obras LIBERADAS podem ser depuradas");
        Status = StatusObra.Depurada;
        ObraDepuradaParaId = novaObraId;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void MarcarDominioPublico(bool valor)
    {
        if (Status == StatusObra.Depurada)
            throw new DomainException("Obras depuradas não podem ser alteradas");
        if (valor)
            Status = StatusObra.DominioPublico;
        else
            Status = Iswc != null ? StatusObra.Liberado : StatusObra.Pendente;
        DominioPublico = valor;
        AtualizadoEm = DateTime.UtcNow;
    }
}
```

### Enums

```csharp
public enum TipoObra { Musical, Literomusical, Versao, PotPourri }
public enum StatusObra { Pendente, Liberado, Bloqueado, DominioPublico, Depurada }
```

### Interface IIswcService (Domain Layer)

```csharp
public interface IIswcService
{
    Task<string> ObterIswcAsync(string titulo, IEnumerable<string> autores, string associacaoSigla, CancellationToken ct);
}
```

### IswcService (Infra Layer — HttpClient + Polly)

```csharp
public class IswcService : IIswcService
{
    private readonly HttpClient _httpClient;

    public async Task<string> ObterIswcAsync(string titulo, IEnumerable<string> autores, string associacaoSigla, CancellationToken ct)
    {
        var request = new { work_title = titulo, authors = autores.ToArray(), association_code = associacaoSigla };
        var response = await _httpClient.PostAsJsonAsync("", request, ct);

        if (!response.IsSuccessStatusCode)
            throw new ExternalServiceException("Não foi possível obter o ISWC neste momento. Por favor, tente novamente mais tarde.");

        var result = await response.Content.ReadFromJsonAsync<IswcApiResponse>(ct);
        return result!.Iswc;
    }
}

// Program.cs — HttpClient com Polly
builder.Services.AddHttpClient<IIswcService, IswcService>(client =>
{
    client.BaseAddress = new Uri("https://iswc.tasso.dev.br/");
    client.Timeout = TimeSpan.FromSeconds(10);
})
.AddTransientHttpErrorPolicy(p => p.RetryAsync(2));
```

### Interface IObraRepository

```csharp
public interface IObraRepository
{
    Task<(IEnumerable<ObraMusical> Items, int Total)> ListarAsync(ObraFiltro filtro, CancellationToken ct);
    Task<ObraMusical?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<bool> ExisteIswcAsync(string iswc, CancellationToken ct);
    Task<bool> ExisteIswcAsync(string iswc, Guid excludeId, CancellationToken ct);
    Task<ObraMusical> AddAsync(ObraMusical obra, CancellationToken ct);
    void Update(ObraMusical obra);
    void Delete(ObraMusical obra);
    Task<bool> PossuiVinculosAsync(Guid obraId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}

public record ObraFiltro(
    int Page = 1, int Size = 20, string? Sort = "titulo",
    string? Titulo = null, string? Iswc = null,
    TipoObra? Tipo = null, StatusObra? Status = null, string? Genero = null);
```

### Schema PostgreSQL

```sql
CREATE TABLE cadastro.obras_musicais (
    "Id"                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    "Titulo"              VARCHAR(300)    NOT NULL,
    "Subtitulo"           VARCHAR(300)    NULL,
    "Tipo"                VARCHAR(15)     NOT NULL,
    "Genero"              VARCHAR(100)    NULL,
    "Iswc"                VARCHAR(20)     NULL,
    "Status"              VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    "DominioPublico"      BOOLEAN         NOT NULL DEFAULT FALSE,
    "ObraDepuradaParaId"  UUID            NULL REFERENCES cadastro.obras_musicais("Id"),
    "CriadoEm"            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "AtualizadoEm"        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_obras_tipo CHECK ("Tipo" IN ('MUSICAL', 'LITEROMUSICAL', 'VERSAO', 'POT_POURRI')),
    CONSTRAINT ck_obras_status CHECK ("Status" IN ('PENDENTE', 'LIBERADO', 'BLOQUEADO', 'DOMINIO_PUBLICO', 'DEPURADA'))
);

CREATE UNIQUE INDEX uq_obras_iswc ON cadastro.obras_musicais ("Iswc") WHERE "Iswc" IS NOT NULL;
CREATE INDEX ix_obras_titulo ON cadastro.obras_musicais USING gin ("Titulo" gin_trgm_ops);
CREATE INDEX ix_obras_tipo ON cadastro.obras_musicais ("Tipo");
CREATE INDEX ix_obras_status ON cadastro.obras_musicais ("Status");
CREATE INDEX ix_obras_depurada_para ON cadastro.obras_musicais ("ObraDepuradaParaId") WHERE "ObraDepuradaParaId" IS NOT NULL;
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Domain** | | |
| `3-Domain/Cadastro.Domain/Entities/ObraMusical.cs` | Entidade | Factory Criar, Atualizar, AtribuirIswc, Depurar, MarcarDominioPublico, RequerDepuracao |
| `3-Domain/Cadastro.Domain/Enums/TipoObra.cs` | Enum | Musical, Literomusical, Versao, PotPourri |
| `3-Domain/Cadastro.Domain/Enums/StatusObra.cs` | Enum | Pendente, Liberado, Bloqueado, DominioPublico, Depurada |
| `3-Domain/Cadastro.Domain/Interfaces/IObraRepository.cs` | Interface | CRUD + ListarAsync + ExisteIswcAsync + PossuiVinculosAsync |
| `3-Domain/Cadastro.Domain/Interfaces/IIswcService.cs` | Interface | ObterIswcAsync — abstração da API externa |
| **Application — Commands** | | |
| `2-Application/.../Obras/Commands/CriarObraCommand.cs` | Command + Handler + Validator | Cria obra PENDENTE |
| `2-Application/.../Obras/Commands/AtualizarObraCommand.cs` | Command + Handler + Validator | Edita; retorna 409 se requer depuração |
| `2-Application/.../Obras/Commands/ExcluirObraCommand.cs` | Command + Handler | Verifica vínculos e status DEPURADA |
| `2-Application/.../Obras/Commands/ObterIswcCommand.cs` | Command + Handler | Chama IIswcService, valida unicidade, salva |
| `2-Application/.../Obras/Commands/DepurarObraCommand.cs` | Command + Handler | Depura original + cria nova (transacional) |
| `2-Application/.../Obras/Commands/AlterarDominioPublicoCommand.cs` | Command + Handler | Toggle DP |
| **Application — Queries** | | |
| `2-Application/.../Obras/Queries/ListarObrasQuery.cs` | Query + Handler | Paginação + filtros |
| `2-Application/.../Obras/Queries/GetObraByIdQuery.cs` | Query + Handler | Inclui obraDepuradaParaId |
| **Application — Responses** | | |
| `2-Application/.../Obras/Responses/ObraResponse.cs` | DTO | Completo com ISWC, status, obraDepuradaParaId |
| `2-Application/.../Obras/Responses/ObraListResponse.cs` | DTO | Lista paginada |
| `2-Application/.../Obras/Responses/DepuracaoResponse.cs` | DTO | obraDepurada + novaObra |
| **Application — Exceptions** | | |
| `2-Application/.../Common/Exceptions/ExternalServiceException.cs` | Exception | API externa indisponível → 502 |
| `2-Application/.../Common/Exceptions/DepuracaoNecessariaException.cs` | Exception | PUT em obra LIBERADA com título alterado → 409 com code |
| **Infra** | | |
| `4-Infra/.../Data/Configurations/ObraMusicalConfiguration.cs` | Config EF | Fluent API, FK self-referencing, unique ISWC parcial |
| `4-Infra/.../Data/Migrations/XXXX_AddObras.cs` | Migration | Tabela + índices |
| `4-Infra/.../Repositories/ObraRepository.cs` | Repository | CRUD + filtros + ExisteIswcAsync |
| `4-Infra/.../ExternalServices/IswcService.cs` | Service | HttpClient POST à API ISWC |
| **API** | | |
| `1-Services/.../Endpoints/ObraEndpoints.cs` | Endpoints | 8 endpoints (CRUD + iswc + depurar + DP) |
| **Testes** | | |
| `5-Tests/.../Obras/CriarObraCommandHandlerTests.cs` | Teste | Happy path, validação |
| `5-Tests/.../Obras/AtualizarObraCommandHandlerTests.cs` | Teste | Edição livre PENDENTE, 409 LIBERADO |
| `5-Tests/.../Obras/ObterIswcCommandHandlerTests.cs` | Teste | Sucesso, sem titulares (422), API falha (502), ISWC duplicado (409) |
| `5-Tests/.../Obras/DepurarObraCommandHandlerTests.cs` | Teste | Depuração ok, status inválido (409) |
| `5-Tests/.../Obras/ExcluirObraCommandHandlerTests.cs` | Teste | Ok, vínculos (409), DEPURADA (409) |
| `5-Tests/.../Obras/ObraMusicalTests.cs` | Teste | Entidade: factory, depurar, ISWC, DP |
| `5-Tests/Cadastro.IntegrationTests/ObraEndpointsTests.cs` | Teste integração | Todos os endpoints |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `4-Infra/.../Data/CadastroDbContext.cs` | Adicionar `DbSet<ObraMusical>`, ApplyConfiguration |
| `1-Services/.../Program.cs` | Registrar IObraRepository, IIswcService (HttpClient+Polly), MapObraEndpoints(), mapear ExternalServiceException→502 e DepuracaoNecessariaException→409 |
| `1-Services/.../Infrastructure/GlobalExceptionHandler.cs` | Adicionar: ExternalServiceException→502, DepuracaoNecessariaException→409 com `code` |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `1-Services/.../Endpoints/TitularEndpoints.cs` | Padrão a seguir para CRUD endpoints |
| `2-Application/.../Titulares/` | Padrão CQRS Commands/Queries |
| `tasks/prd-gestao-obras/api-contract.yaml` | Contrato de API |

---

## Análise de Impacto

| Componente | Tipo | Descrição |
|---|---|---|
| GlobalExceptionHandler | Extensão | +2 exceptions: ExternalServiceException (502), DepuracaoNecessariaException (409 com code) |
| Program.cs | Extensão | +HttpClient com Polly, +IObraRepository, +IIswcService, +MapObraEndpoints |
| CadastroDbContext | Extensão | +DbSet<ObraMusical> |
| F04 (Titularidades) futuro | Dependência | Titularidades serão vinculadas a ObraMusical; alteração de titulares em obra LIBERADA dispara depuração |
| F05 (Fonogramas) futuro | Dependência | Fonogramas referenciam ObraMusical; NÃO migram na depuração |

---

## Abordagem de Testes

### Unitários
| Classe | Cenários |
|--------|----------|
| ObraMusicalTests | Criar (PENDENTE), AtribuirIswc (ok + já tem), Depurar (ok + status inválido), MarcarDP (ok + DEPURADA), RequerDepuracao (true/false), Atualizar (ok + DEPURADA rejeita) |
| CriarObraCommandHandlerTests | Happy path |
| AtualizarObraCommandHandlerTests | PENDENTE (ok), LIBERADO sem mudar título (ok), LIBERADO com título diferente (DepuracaoNecessariaException) |
| ObterIswcCommandHandlerTests | Sucesso, sem titulares (422), API falha (502), ISWC duplicado (409), status != PENDENTE (422) |
| DepurarObraCommandHandlerTests | Ok (cria nova + depura original), status != LIBERADO (409) |
| ExcluirObraCommandHandlerTests | Ok, vínculos (409), DEPURADA (409) |

### Integração
| Cenário | Endpoint | Status |
|---------|----------|--------|
| Criar obra | POST /obras | 201 (PENDENTE) |
| Listar paginado | GET /obras | 200 |
| Atualizar PENDENTE | PUT /obras/{id} | 200 |
| Atualizar LIBERADO (título) | PUT /obras/{id} | 409 DEPURACAO_NECESSARIA |
| Depurar obra | POST /obras/{id}/depurar | 201 (retorna ambas) |
| Obter ISWC | POST /obras/{id}/iswc | 200 (mock da API externa) |
| Excluir DEPURADA | DELETE /obras/{id} | 409 |
| Marcar DP | PUT /obras/{id}/dominio-publico | 200 |

---

## Sequenciamento de Desenvolvimento

1. **Domain** — Entidade ObraMusical, enums, IObraRepository, IIswcService
2. **Infra** — ObraMusicalConfiguration, Migration, ObraRepository
3. **Infra** — IswcService (HttpClient)
4. **Application** — Exceptions (ExternalServiceException, DepuracaoNecessariaException)
5. **Application** — Queries (Listar, GetById) + Responses
6. **Application** — Commands CRUD (Criar, Atualizar, Excluir) + Validators
7. **Application** — Commands especiais (ObterIswc, Depurar, AlterarDominioPublico)
8. **API** — ObraEndpoints + Program.cs + GlobalExceptionHandler
9. **Testes unitários**
10. **Testes de integração**

---

## Mapeamento PRD → Implementação

| Requisito | Camada | Implementação |
|-----------|--------|---------------|
| RF-01 (criar obra) | Domain + Application | ObraMusical.Criar() + CriarObraCommand |
| RF-02 (status PENDENTE) | Domain | Factory retorna StatusObra.Pendente |
| RF-04 (edição livre PENDENTE) | Domain | Atualizar() permite se Pendente |
| RF-06/07 (depuração) | Domain + Application | RequerDepuracao() + DepurarObraCommand (transacional) |
| RF-08 (obra depurada imutável) | Domain | Atualizar() rejeita se Depurada |
| RF-10 (subtítulo/tipo/gênero sem depuração) | Application | AtualizarCommandHandler verifica apenas título |
| RF-15/17 (obter ISWC) | Application + Infra | ObterIswcCommand → IIswcService → HttpClient |
| RF-19 (API indisponível → 502) | Infra + API | ExternalServiceException → GlobalExceptionHandler |
| RF-21 (ISWC único) | Application + Infra | ExisteIswcAsync → ConflictException |
| RF-24 (Domínio Público) | Domain | MarcarDominioPublico(true/false) |
| RF-31 (excluir DEPURADA → 409) | Application | ExcluirCommandHandler verifica status |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar a tech spec do frontend, use a skill `techspec-creator`. Para gerar tasks, use `flow-task-creator`.*

---

## Atualização Apensada - Alinhamento com Código Implementado

> Esta seção foi apendada após análise do código implementado. O conteúdo original acima permanece como referência histórica da especificação planejada.

### Componentes Implementados Além do Spec Original

| Área | Arquivos/Componentes | Observação |
|------|----------------------|------------|
| Código sequencial | `ObraMusical.Codigo`, `ObraMusicalConfiguration`, migration `20260403190454_AddCodigo_CampoCodigo` | Usa sequence `cadastro.seq_obras_codigo`, índice único `uq_obras_codigo` e exposição em `ObraResponse`. |
| Controle de status | `Status/Commands/LiberarObraCommand.cs`, `BloquearObraCommand.cs`, `DesbloquearObraCommand.cs` | Ações separadas para liberar, bloquear e desbloquear obra. |
| Histórico de bloqueio | `HistoricoBloqueio`, `IHistoricoBloqueioRepository`, `HistoricoBloqueiosQuery` | Registra ações `BLOQUEIO` e `DESBLOQUEIO` para entidade `OBRA`. |
| Pré-requisitos de liberação | `ValidadorLiberacaoObra`, `PreRequisito`, `PreRequisitosException` | Retorna 422 estruturado com `pendencias`. |
| Eventos assíncronos | `OutboxEvent`, `OutboxEventWriter`, `OutboxPublisherWorker`, `CadastroChannels` | Publica eventos no exchange `cadastro.events` em formato CloudEvents 1.0. |
| Auditoria | `ObraAuditPublisher`, `ObraAuditEventFactory`, `ObraAuditOperation`, `EfAuditOutboxClient` | Registra trilha de auditoria transacional para operações de obra. |
| Frontend | `frontend/src/features/cadastro/obras/**` | Implementa listagem, filtros, detalhe, formulário, ISWC, depuração, domínio público, status, histórico e integração com titularidades/fonogramas. |

### Modelo de Dados Efetivo

`ObraMusical` possui os campos previstos no spec original e também:

- `Codigo: long`: identificador sequencial humano, gerado no banco.
- `BloqueioJustificativa: string?`: justificativa ativa de bloqueio.
- `TitularidadesAutorais: ICollection<TitularidadeAutoral>`: navegação usada por busca e integrações de titularidade.

O banco possui:

- sequence `cadastro.seq_obras_codigo`;
- índice único `uq_obras_codigo`;
- coluna `BloqueioJustificativa` em `cadastro.obras_musicais`;
- tabela `cadastro.historico_bloqueios`;
- tabelas de outbox transacional e audit outbox.

### API Efetiva de Obras

| Método | Rota | Handler | Permissão |
|--------|------|---------|-----------|
| GET | `/api/v1/obras` | `ListarObrasQueryHandler` | `cadastro:default:obra:listar` |
| POST | `/api/v1/obras` | `CriarObraCommandHandler` | `cadastro:default:obra:criar` |
| GET | `/api/v1/obras/{id}` | `GetObraByIdQueryHandler` | `cadastro:default:obra:visualizar` |
| PUT | `/api/v1/obras/{id}` | `AtualizarObraCommandHandler` | `cadastro:default:obra:editar` |
| DELETE | `/api/v1/obras/{id}` | `ExcluirObraCommandHandler` | `cadastro:default:obra:excluir` |
| POST | `/api/v1/obras/{id}/iswc` | `ObterIswcCommandHandler` | `cadastro:default:obra:gerar-iswc` |
| POST | `/api/v1/obras/{id}/depurar` | `DepurarObraCommandHandler` | `cadastro:default:obra:depurar` |
| PUT | `/api/v1/obras/{id}/dominio-publico` | `AlterarDominioPublicoCommandHandler` | `cadastro:default:obra:dp` |
| POST | `/api/v1/obras/{id}/liberar` | `LiberarObraCommandHandler` | `cadastro:default:status:liberar-obra` |
| POST | `/api/v1/obras/{id}/bloquear` | `BloquearObraCommandHandler` | `cadastro:default:status:bloquear-obra` |
| POST | `/api/v1/obras/{id}/desbloquear` | `DesbloquearObraCommandHandler` | `cadastro:default:status:desbloquear-obra` |
| GET | `/api/v1/obras/{id}/historico-bloqueios` | `HistoricoBloqueiosQueryHandler` | `cadastro:default:status:visualizar-historico-obra` |

### Contratos de Request/Response Efetivos

`ObraResponse` retorna:

- `id`, `codigo`, `titulo`, `subtitulo`, `tipo`, `genero`, `iswc`, `status`, `dominioPublico`, `obraDepuradaParaId`, `criadoEm`, `atualizadoEm`, `bloqueioJustificativa`.

`ObraFiltro` e `ListarObrasQuery` aceitam:

- `page`, `size`, `sort`, `codigo`, `titulo`, `iswc`, `tipo`, `status`, `genero`.

Ordenações implementadas no repositório:

- `titulo`, `-titulo`, `iswc`, `-iswc`, `status`, `-status`, `tipo`, `-tipo`, `atualizadoem`, `-atualizadoem`.

### Regras de Negócio Efetivas

| Fluxo | Implementação atual |
|-------|---------------------|
| Criar | Valida título, tipo e tamanho de campos; cria obra PENDENTE, sem ISWC, com auditoria `Create`. |
| Atualizar | Se obra LIBERADA e título mudou, lança `DepuracaoNecessariaException` com code `DEPURACAO_NECESSARIA`; domínio rejeita DEPURADA, DOMINIO_PUBLICO e BLOQUEADO. |
| Obter ISWC | Exige status PENDENTE e ao menos uma titularidade. Envia autores distintos com categoria `Autor`; associação vem da titularidade de maior percentual, com fallback `UNKNOWN`. Após retorno, valida unicidade, atribui ISWC, muda status para LIBERADO, publica `cadastro.obra.liberada` e registra auditoria `ObtainIswc`. |
| Depurar | Exige obra LIBERADA. Cria nova obra PENDENTE, copia titularidades autorais, marca original como DEPURADA com `ObraDepuradaParaId`, publica `cadastro.obra.depurada` e registra auditoria da obra original e da nova obra. |
| Domínio público | Rejeita DEPURADA. Ao marcar, status vira DOMINIO_PUBLICO; ao desmarcar, volta para LIBERADO se houver ISWC ou PENDENTE se não houver. Publica `cadastro.obra.dominio-publico`. |
| Excluir | Rejeita DEPURADA e obras com titularidades ou fonogramas. Registra auditoria `Delete`. |
| Liberar | Exige PENDENTE e valida título, tipo, ISWC e soma de titularidades igual a `100.0000%`. Retorna 422 com `pendencias` quando houver pré-requisito não atendido. |
| Bloquear | Rejeita DEPURADA e BLOQUEADO. Exige justificativa de 10 a 500 caracteres, salva justificativa ativa, registra histórico, publica `cadastro.obra.bloqueada` e audita `Block`. |
| Desbloquear | Exige BLOQUEADO. Retorna status para PENDENTE, limpa justificativa, registra histórico e audita `Unblock`. Não há evento outbox específico de desbloqueio no código atual. |

### Integração ISWC Efetiva

- A URL base é configurável por `ISWC_BASE_URL`; valor padrão: `https://iswc.tasso.dev.br/`.
- O serviço faz `POST api/iswc` relativo à base configurada.
- Timeout HTTP: 10 segundos.
- Resiliência: `AddTransientHttpErrorPolicy(p => p.RetryAsync(2))`.
- A resposta usada pelo domínio é apenas `iswc`; demais campos da resposta externa não são consumidos.

### Frontend Efetivo

| Tela/Componente | Função |
|-----------------|--------|
| `ObrasPage` | Listagem paginada, filtros, ação "Nova Obra", tabela, paginação e exclusão modal. |
| `ObrasFilters` | Filtros por título, código, ISWC, tipo, status e gênero com debounce para campos texto/número. |
| `ObrasTable` | Exibe código, título/subtítulo, tipo, gênero, ISWC, status, botão de auditoria, editar e excluir. |
| `ObraCreatePage` | Criação de obra e retorno para listagem filtrada pelo título criado. |
| `ObraDetailPage` | Agrega formulário, ISWC, titularidades, fonogramas, propriedades, ações de status, banners, checklist, histórico e modais. |
| `IswcSection` | Exibe ISWC e botão "Obter ISWC" condicionado a status PENDENTE, ausência de ISWC, titularidades e permissão de escrita. |
| `DepuracaoModal` | Confirma depuração e navega para a nova obra. |
| `DominioPublicoToggle` | Alterna domínio público conforme permissão. |
| `DepuracaoBanner` | Exibe link para nova versão com código quando disponível. |
| `ChecklistPreRequisitos` | Exibe pendências retornadas por `PreRequisitosException`. |
| `HistoricoBloqueios` | Lista ações de bloqueio/desbloqueio. |

### Testes Existentes Relacionados

- Unitários de obras: `CriarObraCommandHandlerTests`, `AtualizarObraCommandHandlerTests`, `ObterIswcCommandHandlerTests`, `DepurarObraCommandHandlerTests`, `AlterarDominioPublicoCommandHandlerTests`, `ExcluirObraCommandHandlerTests`, `ObraMusicalTests`.
- Unitários de status: `ValidadorLiberacaoObraTests`.
- Integração: `ObraEndpointsTests`, `OutboxEventosIntegrationTests`, `CodigoIntegrationTests`, `TitularidadeEndpointsTests`.
- E2E/frontend em evidências da task: `qa-evidence/**` com cenários de criação, listagem/busca, edição, ISWC, domínio público, depuração e exclusão.

### Divergências Técnicas e Débitos

- `ObrasTable` permite ordenar por `codigo`, mas `ObraRepository.ListarAsync` não possui casos `codigo` e `-codigo`; o backend cai na ordenação padrão por título.
- `ObterIswcCommandHandler` exige qualquer titularidade, mas envia para `authors` somente titulares com categoria `Autor`; se a obra tiver titularidades sem Autor, a lista enviada pode ficar vazia.
- `ObraMusical.AtribuirIswc` muda status para LIBERADO, enquanto `LiberarObraCommand` também existe e exige obra PENDENTE com ISWC. O desenho de estados precisa decidir se a liberação é automática na obtenção de ISWC ou se deve ser uma ação posterior.
- A mensagem de conflito em `ExcluirObraCommandHandler` cita titularidades, embora `PossuiVinculosAsync` também verifique fonogramas.
- `ObraForm` marca DEPURADA e DOMINIO_PUBLICO como somente leitura; BLOQUEADO é rejeitado no domínio, mas não está incluído na regra local de read-only do formulário.
- O evento de desbloqueio não possui canal/outbox próprio, embora haja histórico e auditoria da ação.
