# Especificação Técnica Backend — F02: Registro Manual de Execuções

> **PRD:** `tasks/prd-registro-manual-execucoes/prd.md`
> **API Contract:** `tasks/prd-registro-manual-execucoes/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-02

---

## Resumo Executivo

Esta feature adiciona a entidade Execução ao serviço de Identificação (já criado em F01), com CRUD completo via endpoints de sub-recurso (`/captacoes/{id}/execucoes`), seed de Tipos de Utilização, integração HTTP com o Cadastro para busca unificada e criação de obras/fonogramas pendentes, e validação condicional de campos por rubrica.

Adicionalmente, um novo endpoint de busca unificada é criado **no serviço de Cadastro** (`GET /api/v1/busca`) como dependência desta feature.

A implementação é incremental — adiciona ao serviço existente sem alterar o que já funciona.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend       │────▶│ Identificação   │────▶│ Cadastro API    │
│   React/Vite     │     │ API :5100       │     │ :5001           │
└─────────────────┘     │                 │     │ GET /busca      │
                         │ POST /execucoes │     │ POST /obras     │
                         │ GET /execucoes  │     │ POST /fonogramas│
                         └────────┬────────┘     └─────────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │  PostgreSQL 16         │
                      │  schema: identificacao │
                      │  + tabelas: execucoes, │
                      │    tipos_utilizacao    │
                      └───────────────────────┘
```

**Dois serviços impactados:**
- **Identificação API** — CRUD de execuções, seed de tipos, HTTP client para Cadastro
- **Cadastro API** — novo endpoint de busca unificada

---

## Design de Implementação

### Entidade: Execução

```csharp
public class Execucao
{
    public Guid Id { get; private set; }
    public Guid CaptacaoId { get; private set; }
    public Captacao Captacao { get; private set; }
    public Guid ObraId { get; private set; }
    public Guid? FonogramaId { get; private set; }
    public string ObraTitulo { get; private set; }
    public string? FonogramaIsrc { get; private set; }
    public string? ObraIswc { get; private set; }
    public string Interpretes { get; private set; }
    public TimeOnly Inicio { get; private set; }
    public TimeOnly Fim { get; private set; }
    public int DuracaoSegundos { get; private set; }
    public int Quantidade { get; private set; }
    public Guid? TipoUtilizacaoId { get; private set; }
    public TipoUtilizacao? TipoUtilizacao { get; private set; }
    public string? TituloPrograma { get; private set; }
    public StatusExecucao Status { get; private set; }
    public DateTime CriadoEm { get; private set; }
    public DateTime AtualizadoEm { get; private set; }

    private Execucao() { }

    public static Execucao Criar(
        Guid captacaoId, Guid obraId, Guid? fonogramaId,
        string obraTitulo, string? fonogramaIsrc, string? obraIswc,
        string interpretes, TimeOnly inicio, TimeOnly fim,
        int quantidade, Guid? tipoUtilizacaoId, string? tituloPrograma,
        StatusExecucao status)
    {
        if (fim <= inicio)
            throw new DomainException("O horário de fim deve ser posterior ao início.");

        return new Execucao
        {
            Id = Guid.NewGuid(),
            CaptacaoId = captacaoId,
            ObraId = obraId,
            FonogramaId = fonogramaId,
            ObraTitulo = obraTitulo,
            FonogramaIsrc = fonogramaIsrc,
            ObraIswc = obraIswc,
            Interpretes = interpretes,
            Inicio = inicio,
            Fim = fim,
            DuracaoSegundos = (int)(fim.ToTimeSpan() - inicio.ToTimeSpan()).TotalSeconds,
            Quantidade = quantidade,
            TipoUtilizacaoId = tipoUtilizacaoId,
            TituloPrograma = tituloPrograma,
            Status = status,
            CriadoEm = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow,
        };
    }

    public void Atualizar(
        Guid obraId, Guid? fonogramaId,
        string obraTitulo, string? fonogramaIsrc, string? obraIswc,
        string interpretes, TimeOnly inicio, TimeOnly fim,
        int quantidade, Guid? tipoUtilizacaoId, string? tituloPrograma,
        StatusExecucao status)
    {
        if (fim <= inicio)
            throw new DomainException("O horário de fim deve ser posterior ao início.");

        ObraId = obraId;
        FonogramaId = fonogramaId;
        ObraTitulo = obraTitulo;
        FonogramaIsrc = fonogramaIsrc;
        ObraIswc = obraIswc;
        Interpretes = interpretes;
        Inicio = inicio;
        Fim = fim;
        DuracaoSegundos = (int)(fim.ToTimeSpan() - inicio.ToTimeSpan()).TotalSeconds;
        Quantidade = quantidade;
        TipoUtilizacaoId = tipoUtilizacaoId;
        TituloPrograma = tituloPrograma;
        Status = status;
        AtualizadoEm = DateTime.UtcNow;
    }
}
```

### Entidade: TipoUtilizacao (Seed)

```csharp
public class TipoUtilizacao
{
    public Guid Id { get; private set; }
    public string Sigla { get; private set; }
    public string Descricao { get; private set; }
    public decimal Peso { get; private set; }

    private TipoUtilizacao() { }

    public static TipoUtilizacao Criar(Guid id, string sigla, string descricao, decimal peso) => new()
    {
        Id = id, Sigla = sigla, Descricao = descricao, Peso = peso
    };
}
```

### Enum: StatusExecucao

```csharp
public enum StatusExecucao
{
    Identificada,
    Pendente
}
```

### Interface: ICadastroHttpClient

```csharp
public interface ICadastroHttpClient
{
    Task<BuscaCadastroResponse> BuscarAsync(string query, string? tipo, int size, CancellationToken ct);
    Task<ResultadoBuscaDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct);
    Task<ResultadoBuscaDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct);
}
```

### Interface: IExecucaoRepository

```csharp
public interface IExecucaoRepository
{
    Task<Execucao?> GetByIdAsync(Guid captacaoId, Guid id, CancellationToken ct);
    Task<(IEnumerable<Execucao> Items, int Total)> ListarAsync(
        Guid captacaoId, string? status, string sort, int page, int size, CancellationToken ct);
    Task<int> ContarPorCaptacaoAsync(Guid captacaoId, CancellationToken ct);
    Task<int> ContarIdentificadasAsync(Guid captacaoId, CancellationToken ct);
    Task<int> ContarPendentesAsync(Guid captacaoId, CancellationToken ct);
    Task AddAsync(Execucao execucao, CancellationToken ct);
    Task RemoveAsync(Execucao execucao, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
```

### Schema PostgreSQL (migration incremental)

```sql
CREATE TABLE identificacao."TiposUtilizacao" (
    "Id"         UUID PRIMARY KEY,
    "Sigla"      VARCHAR(5) NOT NULL UNIQUE,
    "Descricao"  VARCHAR(100) NOT NULL,
    "Peso"       DECIMAL(10,4) NOT NULL
);

CREATE TABLE identificacao."Execucoes" (
    "Id"                UUID PRIMARY KEY,
    "CaptacaoId"        UUID NOT NULL REFERENCES identificacao."Captacoes"("Id") ON DELETE CASCADE,
    "ObraId"            UUID NOT NULL,
    "FonogramaId"       UUID,
    "ObraTitulo"        VARCHAR(300) NOT NULL,
    "FonogramaIsrc"     VARCHAR(20),
    "ObraIswc"          VARCHAR(20),
    "Interpretes"       VARCHAR(500) NOT NULL,
    "Inicio"            TIME NOT NULL,
    "Fim"               TIME NOT NULL,
    "DuracaoSegundos"   INTEGER NOT NULL,
    "Quantidade"        INTEGER NOT NULL DEFAULT 1,
    "TipoUtilizacaoId"  UUID REFERENCES identificacao."TiposUtilizacao"("Id"),
    "TituloPrograma"    VARCHAR(255),
    "Status"            VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    "CriadoEm"          TIMESTAMP WITH TIME ZONE NOT NULL,
    "AtualizadoEm"      TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX ix_execucoes_captacao ON identificacao."Execucoes" ("CaptacaoId");
CREATE INDEX ix_execucoes_obra ON identificacao."Execucoes" ("ObraId");
```

**Nota:** `ON DELETE CASCADE` na FK de CaptacaoId — quando uma captação ABERTA é excluída (F01), suas execuções são removidas automaticamente.

### Endpoints (conforme api-contract.yaml)

| Método | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/api/v1/tipos-utilizacao` | `ListarTiposUtilizacaoQueryHandler` | read |
| GET | `/api/v1/captacoes/{captacaoId}/execucoes` | `ListarExecucoesQueryHandler` | read |
| POST | `/api/v1/captacoes/{captacaoId}/execucoes` | `CriarExecucaoCommandHandler` | write |
| PUT | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | `AtualizarExecucaoCommandHandler` | write |
| DELETE | `/api/v1/captacoes/{captacaoId}/execucoes/{id}` | `ExcluirExecucaoCommandHandler` | write |

### CQRS — Commands & Queries

**Commands:**
```csharp
public record CriarExecucaoCommand(
    Guid CaptacaoId, Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma,
    Guid AnalistaId  // do JWT
) : ICommand<ExecucaoResponse>;

public record AtualizarExecucaoCommand(
    Guid CaptacaoId, Guid Id,
    Guid ObraId, Guid? FonogramaId,
    TimeOnly Inicio, TimeOnly Fim, int Quantidade,
    Guid? TipoUtilizacaoId, string? TituloPrograma,
    Guid AnalistaId
) : ICommand<ExecucaoResponse>;

public record ExcluirExecucaoCommand(Guid CaptacaoId, Guid Id, Guid AnalistaId)
    : ICommand<Unit>;
```

**Queries:**
```csharp
public record ListarTiposUtilizacaoQuery() : IQuery<TipoUtilizacaoListResponse>;

public record ListarExecucoesQuery(
    Guid CaptacaoId, int Page = 1, int Size = 20,
    string? Status = null, string Sort = "inicio"
) : IQuery<ExecucaoListResponse>;
```

### CriarExecucaoCommandHandler — Lógica principal

```csharp
public async Task<ExecucaoResponse> HandleAsync(CriarExecucaoCommand cmd, CancellationToken ct)
{
    // 1. Buscar captação e validar
    var captacao = await _captacaoRepo.GetByIdAsync(cmd.CaptacaoId, ct)
        ?? throw new NotFoundException("Captação não encontrada.", cmd.CaptacaoId);
    captacao.ValidarAberta();
    captacao.ValidarPropriedade(cmd.AnalistaId);

    // 2. Validar campos condicionais por rubrica (RN-12)
    if (captacao.Rubrica.ExigeClassificacao)
    {
        if (cmd.TipoUtilizacaoId == null)
            throw new DomainException("Tipo de utilização é obrigatório para a rubrica " + captacao.Rubrica.Nome);
        if (string.IsNullOrWhiteSpace(cmd.TituloPrograma))
            throw new DomainException("Título do programa é obrigatório para a rubrica " + captacao.Rubrica.Nome);
    }

    // 3. Consultar Cadastro para resolver obra/fonograma
    var obraInfo = await _cadastroClient.GetObraByIdAsync(cmd.ObraId, ct);
    string obraTitulo, interpretes;
    string? fonogramaIsrc = null, obraIswc = null;
    StatusExecucao status;

    if (obraInfo != null)
    {
        obraTitulo = obraInfo.Titulo;
        obraIswc = obraInfo.Iswc;
        interpretes = "";
        status = obraInfo.Status == "LIBERADO" ? StatusExecucao.Identificada : StatusExecucao.Pendente;
    }
    else
    {
        // Obra não encontrada no Cadastro (edge case)
        throw new NotFoundException("Obra não encontrada no Cadastro.", cmd.ObraId);
    }

    // 4. Se fonograma informado, buscar dados
    if (cmd.FonogramaId.HasValue)
    {
        var fonoInfo = await _cadastroClient.GetFonogramaByIdAsync(cmd.FonogramaId.Value, ct);
        if (fonoInfo != null)
        {
            fonogramaIsrc = fonoInfo.Isrc;
            interpretes = fonoInfo.Interpretes ?? "";
            if (fonoInfo.Status != "LIBERADO")
                status = StatusExecucao.Pendente;
        }
    }

    // 5. Criar entidade
    var execucao = Execucao.Criar(
        cmd.CaptacaoId, cmd.ObraId, cmd.FonogramaId,
        obraTitulo, fonogramaIsrc, obraIswc, interpretes,
        cmd.Inicio, cmd.Fim, cmd.Quantidade,
        cmd.TipoUtilizacaoId, cmd.TituloPrograma, status);

    await _execucaoRepo.AddAsync(execucao, ct);
    await _execucaoRepo.SaveChangesAsync(ct);

    return MapToResponse(execucao);
}
```

### Mapeamento de Regras de Negócio

| Regra | Camada | Implementação |
|-------|--------|---------------|
| RN-02 — Pendente se sem match | Application (handler) | Status derivado do response do Cadastro |
| RN-03 — Acumula contagem | Domain (campo Quantidade) | Múltiplas execuções independentes permitidas |
| RN-04 — Fechada: sem alteração | Domain (`ValidarAberta()`) | Chamado no handler antes de criar/editar/excluir |
| RN-08 — Somente o dono | Domain (`ValidarPropriedade()`) | Chamado no handler com analistaId do JWT |
| RN-09 — Identificação automática | Application (handler) | Consulta Cadastro HTTP, define status |
| RN-12 — Campos condicionais | Application (handler + validator) | Valida tipoUtilizacaoId e tituloPrograma com base em `Rubrica.ExigeClassificacao` |
| Horário fim > início | Domain (factory + Atualizar) | `DomainException` se `fim <= inicio` |

---

## Dependência: Busca Unificada no Cadastro

### Novo endpoint no Cadastro API

**Path:** `GET /api/v1/busca?q={termo}&tipo={obra|fonograma|todos}&size={20}`

**Implementação no Cadastro:**

```csharp
// BuscaCadastroQuery.cs
public record BuscaCadastroQuery(string Q, string Tipo = "todos", int Size = 20)
    : IQuery<BuscaCadastroResponse>;

// BuscaCadastroQueryHandler.cs
public async Task<BuscaCadastroResponse> HandleAsync(BuscaCadastroQuery query, CancellationToken ct)
{
    var resultados = new List<ResultadoBuscaDto>();

    if (query.Tipo is "todos" or "obra")
    {
        var obras = await _obraRepo.BuscarAsync(query.Q, query.Size, ct);
        resultados.AddRange(obras.Select(o => new ResultadoBuscaDto(
            Tipo: "obra", Id: o.Id, ObraId: null,
            Titulo: o.Titulo, Isrc: null, Iswc: o.Iswc,
            Interpretes: null, Status: o.Status.ToString())));
    }

    if (query.Tipo is "todos" or "fonograma")
    {
        var fonogramas = await _fonogramaRepo.BuscarAsync(query.Q, query.Size, ct);
        resultados.AddRange(fonogramas.Select(f => new ResultadoBuscaDto(
            Tipo: "fonograma", Id: f.Id, ObraId: f.ObraId,
            Titulo: f.Obra.Titulo, Isrc: f.Isrc,
            Iswc: f.Obra.Iswc,
            Interpretes: FormatarInterpretes(f),
            Status: f.Status.ToString())));
    }

    return new BuscaCadastroResponse(resultados.Take(query.Size));
}
```

**Novos métodos nos repos do Cadastro:**
```csharp
// IObraRepository — adicionar:
Task<IEnumerable<ObraMusical>> BuscarAsync(string termo, int limit, CancellationToken ct);

// IFonogramaRepository — adicionar:
Task<IEnumerable<Fonograma>> BuscarAsync(string termo, int limit, CancellationToken ct);
```

**Lógica de busca nos repos:**
- Se `termo` tem formato ISRC (12 chars alfanumérico): buscar por ISRC exato
- Se `termo` tem formato ISWC (T-XXX.XXX.XXX-X): buscar por ISWC exato
- Senão: `ILike` em título de obra/fonograma + nome de titular

### CadastroHttpClient na Identificação

```csharp
public class CadastroHttpClient : ICadastroHttpClient
{
    private readonly HttpClient _client;

    public async Task<BuscaCadastroResponse> BuscarAsync(
        string query, string? tipo, int size, CancellationToken ct)
    {
        var url = $"/api/v1/busca?q={Uri.EscapeDataString(query)}&tipo={tipo ?? "todos"}&size={size}";
        var response = await _client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BuscaCadastroResponse>(ct);
    }

    public async Task<ResultadoBuscaDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/obras/{obraId}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ResultadoBuscaDto>(ct);
    }

    public async Task<ResultadoBuscaDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/fonogramas/{fonogramaId}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ResultadoBuscaDto>(ct);
    }
}
```

**Registro no Program.cs da Identificação:**
```csharp
var cadastroBaseUrl = Environment.GetEnvironmentVariable("CADASTRO_API_BASE_URL")
    ?? "http://localhost:5001/api/v1";

builder.Services.AddHttpClient<ICadastroHttpClient, CadastroHttpClient>(client =>
{
    client.BaseAddress = new Uri(cadastroBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
}).AddTransientHttpErrorPolicy(p => p.RetryAsync(2));
```

---

## Atualização dos Contadores de Resumo (F01)

O `GetCaptacaoByIdQueryHandler` (F01) retorna `ResumoExecucoes` com valores zerados. Agora alimentamos com dados reais:

```csharp
// GetCaptacaoByIdQueryHandler — atualizar:
var total = await _execucaoRepo.ContarPorCaptacaoAsync(query.Id, ct);
var identificadas = await _execucaoRepo.ContarIdentificadasAsync(query.Id, ct);
var pendentes = await _execucaoRepo.ContarPendentesAsync(query.Id, ct);

var resumo = new ResumoExecucoesResponse(total, identificadas, pendentes);
```

---

## Inventário de Artefatos

### Arquivos a Criar — Identificação API

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Execucao.cs` | Entity | Aggregate child — factory, validação de horários |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/TipoUtilizacao.cs` | Entity | Seed — sigla, descrição, peso |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Enums/StatusExecucao.cs` | Enum | Identificada, Pendente |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs` | Interface | Contrato do repo de execuções |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ITipoUtilizacaoRepository.cs` | Interface | Contrato read-only |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/ICadastroHttpClient.cs` | Interface | Contrato do HTTP client para Cadastro |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/ExecucaoConfiguration.cs` | Config | FK, índices, column types |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/TipoUtilizacaoConfiguration.cs` | Config | Unique index em Sigla |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/TipoUtilizacaoSeed.cs` | Seed | 4 registros (TA, TE, PE, BK) |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Migrations/XXXX_AddExecucoesETiposUtilizacao.cs` | Migration | Tabelas execucoes + tipos_utilizacao |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` | Repository | CRUD, contadores, filtros, sort |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/TipoUtilizacaoRepository.cs` | Repository | Read-only |
| `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/CadastroHttpClient.cs` | Service | HTTP client para busca e get by ID |
| `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Queries/ListarTiposUtilizacaoQuery.cs` | Query | Listar tipos |
| `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Queries/ListarTiposUtilizacaoQueryHandler.cs` | Handler | Handler |
| `services/identificacao-api/2-Application/Identificacao.Application/TiposUtilizacao/Responses/TipoUtilizacaoResponse.cs` | DTO | Response |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/CriarExecucaoCommand.cs` | Command | + Validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/CriarExecucaoCommandHandler.cs` | Handler | Cria execução, consulta Cadastro, define status |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/AtualizarExecucaoCommand.cs` | Command | + Validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/AtualizarExecucaoCommandHandler.cs` | Handler | Atualiza, recalcula status |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/ExcluirExecucaoCommand.cs` | Command | Excluir |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/ExcluirExecucaoCommandHandler.cs` | Handler | Valida dono + aberta, remove |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Queries/ListarExecucoesQuery.cs` | Query | Filtros, paginação |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Queries/ListarExecucoesQueryHandler.cs` | Handler | Listagem |
| `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Responses/ExecucaoResponse.cs` | DTO | Response com todos os campos |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/ExecucaoEndpoints.cs` | Endpoint | Sub-recurso /captacoes/{id}/execucoes |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/TipoUtilizacaoEndpoints.cs` | Endpoint | GET /tipos-utilizacao |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Domain/ExecucaoTests.cs` | Teste | Factory, validação horários |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/CriarExecucaoCommandHandlerTests.cs` | Teste | Criação, campos condicionais, status |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/AtualizarExecucaoCommandHandlerTests.cs` | Teste | Edição, recálculo de status |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ExcluirExecucaoCommandHandlerTests.cs` | Teste | Exclusão, validação de dono |

### Arquivos a Criar — Cadastro API (novo endpoint de busca)

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/cadastro-api/1-Services/Cadastro.API/Endpoints/BuscaEndpoints.cs` | Endpoint | GET /api/v1/busca |
| `services/cadastro-api/2-Application/Cadastro.Application/Busca/Queries/BuscaCadastroQuery.cs` | Query | Busca unificada |
| `services/cadastro-api/2-Application/Cadastro.Application/Busca/Queries/BuscaCadastroQueryHandler.cs` | Handler | Busca em obras + fonogramas + titulares |
| `services/cadastro-api/2-Application/Cadastro.Application/Busca/Responses/BuscaCadastroResponse.cs` | DTO | Lista de ResultadoBuscaDto |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` | Adicionar DbSets de Execucao e TipoUtilizacao |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Registrar novos repos, HttpClient para Cadastro, mapear novos endpoints |
| `services/identificacao-api/.env.example` | Adicionar `CADASTRO_API_BASE_URL` |
| `services/identificacao-api/2-Application/Identificacao.Application/Captacoes/Queries/GetCaptacaoByIdQueryHandler.cs` | Alimentar ResumoExecucoes com dados reais |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs` | Implementar `ContarExecucoesAsync` real (não mais placeholder) |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IObraRepository.cs` | Adicionar `BuscarAsync(termo, limit, ct)` |
| `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IFonogramaRepository.cs` | Adicionar `BuscarAsync(termo, limit, ct)` |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` | Implementar `BuscarAsync` (ILike por título + ISWC) |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/FonogramaRepository.cs` | Implementar `BuscarAsync` (ILike por título + ISRC + titular) |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Mapear `BuscaEndpoints` |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` | Entidade pai — ValidarAberta, ValidarPropriedade |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Rubrica.cs` | ExigeClassificacao para validação condicional |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/RubricaSeed.cs` | Padrão de seed |
| `services/cadastro-api/1-Services/Cadastro.API/Endpoints/TitularEndpoints.cs` | Padrão de endpoint de busca (/busca) |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Padrão de HttpClient com Polly |
| `tasks/prd-registro-manual-execucoes/api-contract.yaml` | Contrato da API |

---

## Abordagem de Testes

### Testes Unitários — Domain

| Cenário | Arquivo |
|---------|---------|
| Criar execução com dados válidos | `ExecucaoTests.cs` |
| Rejeitar fim anterior ao início | `ExecucaoTests.cs` |
| Calcular duração corretamente (225s) | `ExecucaoTests.cs` |
| Atualizar execução recalcula duração | `ExecucaoTests.cs` |

### Testes Unitários — Application Handlers

| Cenário | Arquivo |
|---------|---------|
| Criar execução com obra LIBERADA → IDENTIFICADA | `CriarExecucaoCommandHandlerTests.cs` |
| Criar execução com obra PENDENTE → PENDENTE | `CriarExecucaoCommandHandlerTests.cs` |
| Rejeitar criação sem tipo utilização em rubrica audiovisual | `CriarExecucaoCommandHandlerTests.cs` |
| Rejeitar criação sem título programa em rubrica audiovisual | `CriarExecucaoCommandHandlerTests.cs` |
| Permitir criação sem tipo utilização em rubrica não-audiovisual | `CriarExecucaoCommandHandlerTests.cs` |
| Rejeitar criação em captação FECHADA | `CriarExecucaoCommandHandlerTests.cs` |
| Rejeitar criação por outro analista | `CriarExecucaoCommandHandlerTests.cs` |
| Atualizar obra/fonograma recalcula status | `AtualizarExecucaoCommandHandlerTests.cs` |
| Excluir com sucesso em captação ABERTA | `ExcluirExecucaoCommandHandlerTests.cs` |
| Rejeitar exclusão em captação FECHADA | `ExcluirExecucaoCommandHandlerTests.cs` |
| Rejeitar exclusão por outro analista | `ExcluirExecucaoCommandHandlerTests.cs` |

---

## Sequenciamento de Desenvolvimento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Domain — Execucao, TipoUtilizacao, StatusExecucao, interfaces | Nenhuma (F01 já existe) |
| 2 | Infra — DbContext, configurations, migration, seeds, repos | Etapa 1 |
| 3 | Cadastro API — endpoint de busca + métodos BuscarAsync nos repos | Nenhuma (paralelo com 1-2) |
| 4 | Infra — CadastroHttpClient | Etapa 3 |
| 5 | Application — TiposUtilizacao query + handler | Etapa 2 |
| 6 | Application — Commands + handlers (Criar, Atualizar, Excluir) | Etapa 2 + 4 |
| 7 | Application — ListarExecucoes query + handler | Etapa 2 |
| 8 | API — Endpoints, Program.cs updates, .env.example | Etapa 5 + 6 + 7 |
| 9 | Atualizar GetCaptacaoByIdQueryHandler (resumo real) | Etapa 2 |
| 10 | Testes unitários | Etapa 6 |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Antes de implementar o frontend, desenhar no Stitch:
1. Seção "Execuções" dentro do detalhe da captação (tabela + botão adicionar)
2. Formulário de adição/edição de execução (com busca autocomplete + campos condicionais)
3. Dialog de confirmação de exclusão de execução
4. Componente de busca com opção "Criar obra/fonograma pendente"

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| TimeOnly para horários | Sim | .NET 8 suporta TimeOnly nativamente; EF Core mapeia para TIME |
| Snapshot de título/ISRC/intérpretes | Sim | Evita consulta ao Cadastro a cada exibição; dados podem mudar no Cadastro depois |
| ON DELETE CASCADE em Execucao→Captacao | Sim | F01 já permite excluir captação ABERTA com execuções |
| HttpClient com Polly | Sim | Mesmo padrão do Cadastro (IswcService); 2 retries, 10s timeout |
| Busca no Cadastro via API (não join) | Sim | Schema isolation; Identificação nunca acessa schema cadastro direto |

### Riscos

| Risco | Mitigação |
|---|---|
| Cadastro API fora do ar durante criação de execução | Handler trata timeout/erro e pode salvar como PENDENTE |
| Snapshot de dados pode ficar desatualizado | Aceitável para PoC; atualização manual via edição da execução |
| TimeOnly não suportado nativamente pelo Npgsql em todas as versões | Verificar versão; EF Core 8+ com Npgsql 8+ suporta TimeOnly → TIME |

---

*TechSpec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator`.*
