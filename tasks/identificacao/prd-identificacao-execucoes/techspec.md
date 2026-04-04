# Especificação Técnica Backend — F04: Identificação de Execuções

> **PRD:** `tasks/prd-identificacao-execucoes/prd.md`
> **API Contract:** `tasks/prd-identificacao-execucoes/api-contract.yaml`
> **Domínio:** Identificação (D02)
> **Última revisão:** 2026-04-04

---

## Resumo Executivo

Esta feature adiciona ao serviço de Identificação: endpoints de listagem centralizada de execuções pendentes com indicador de impacto, resolução manual (individual e em lote) vinculando a obra/fonograma LIBERADA, e um background job (`PendentesVerificadorWorker`) que re-verifica automaticamente o status de obras/fonogramas no Cadastro para resolver pendentes sem intervenção.

Não cria entidades novas — reutiliza a entidade `Execucao` (F02) e o `CadastroHttpClient` (F02). A principal adição é lógica de query (agrupamento por ISRC/ISWC com contagem de captações) e o worker de re-verificação.

---

## Arquitetura do Sistema

```
┌──────────────────┐     ┌──────────────────────────────┐
│   Frontend        │────▶│  Identificação API :5100      │
│  /pendentes       │     │                              │
│                  │     │  GET /pendentes               │
│                  │     │  GET /pendentes/impacto        │
│                  │     │  POST /pendentes/{id}/resolver │
│                  │     │  POST /pendentes/resolver-lote │
│                  │     │                              │
│                  │     │  ┌──────────────────────────┐│
│                  │     │  │PendentesVerificadorWorker ││──▶ Cadastro API :5001
│                  │     │  │(Background Job — a cada   ││    GET /obras/{id}
│                  │     │  │ 5 min)                    ││    GET /fonogramas/{id}
│                  │     │  └──────────────────────────┘│
└──────────────────┘     └──────────┬───────────────────┘
                                     │
                         ┌───────────▼───────────┐
                         │  PostgreSQL 16         │
                         │  schema: identificacao │
                         └───────────────────────┘
```

**Componentes novos:**
- **PendenteEndpoints** — 4 endpoints REST
- **PendentesVerificadorWorker** — background job de re-verificação automática
- **Queries de impacto** — GROUP BY com contagem cross-captação

---

## Design de Implementação

### Interfaces Principais

```csharp
// Extensão do IExecucaoRepository existente (F02)
public interface IExecucaoRepository
{
    // ... métodos existentes da F02 ...

    // Novos para F04:
    Task<(IEnumerable<Execucao> Items, int Total)> ListarPendentesAsync(
        Guid? captacaoId, Guid? rubricaId, DateOnly? periodoInicio, DateOnly? periodoFim,
        string? q, string sort, int page, int size, CancellationToken ct);

    Task<(IEnumerable<ImpactoPendenteDto> Items, int Total)> ListarImpactoPendentesAsync(
        string sort, int page, int size, CancellationToken ct);

    Task<IEnumerable<Execucao>> ListarPendentesPorIdentificadorAsync(
        string identificador, CancellationToken ct);

    Task<IEnumerable<Execucao>> ListarPendentesComObraIdAsync(CancellationToken ct);
}
```

```csharp
// DTO para query de impacto (resultado de GROUP BY)
public record ImpactoPendenteDto(
    string Identificador,        // ISRC ou ISWC
    string TipoIdentificador,   // "isrc", "iswc", "desconhecido"
    string? ObraTitulo,
    int TotalExecucoes,
    int TotalCaptacoes,
    List<CaptacaoImpactoDto> Captacoes);

public record CaptacaoImpactoDto(
    Guid CaptacaoId, string Rubrica, DateOnly Periodo, int ExecucoesPendentes);
```

### Endpoints (conforme api-contract.yaml)

| Método | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/api/v1/pendentes` | `ListarPendentesQueryHandler` | read |
| GET | `/api/v1/pendentes/impacto` | `ListarImpactoPendentesQueryHandler` | read |
| POST | `/api/v1/pendentes/{id}/resolver` | `ResolverPendenteCommandHandler` | write |
| POST | `/api/v1/pendentes/resolver-lote` | `ResolverPendentesEmLoteCommandHandler` | write |

### CQRS — Commands & Queries

**Queries:**
```csharp
public record ListarPendentesQuery(
    Guid? CaptacaoId = null, Guid? RubricaId = null,
    DateOnly? PeriodoInicio = null, DateOnly? PeriodoFim = null,
    string? Q = null, string Sort = "-criadoEm",
    int Page = 1, int Size = 20
) : IQuery<PendenteListResponse>;

public record ListarImpactoPendentesQuery(
    string Sort = "-totalCaptacoes", int Page = 1, int Size = 20
) : IQuery<ImpactoPendenteListResponse>;
```

**Commands:**
```csharp
public record ResolverPendenteCommand(
    Guid ExecucaoId, Guid ObraId, Guid? FonogramaId, Guid AnalistaId
) : ICommand<ExecucaoPendenteResponse>;

public record ResolverPendentesEmLoteCommand(
    List<Guid> ExecucaoIds, Guid ObraId, Guid? FonogramaId, Guid AnalistaId
) : ICommand<ResolverLoteResponse>;
```

### ResolverPendenteCommandHandler — Lógica

```csharp
public async Task<ExecucaoPendenteResponse> HandleAsync(ResolverPendenteCommand cmd, CancellationToken ct)
{
    var execucao = await _execucaoRepo.GetByIdComCaptacaoAsync(cmd.ExecucaoId, ct)
        ?? throw new NotFoundException("Execução não encontrada.", cmd.ExecucaoId);

    if (execucao.Status != StatusExecucao.Pendente)
        throw new ConflictException("Execução já está identificada.", "JA_IDENTIFICADA");

    execucao.Captacao.ValidarAberta();

    // Validar obra/fonograma LIBERADA no Cadastro
    var obraInfo = await _cadastroClient.GetObraByIdAsync(cmd.ObraId, ct)
        ?? throw new NotFoundException("Obra não encontrada no Cadastro.", cmd.ObraId);

    if (obraInfo.Status != "LIBERADO")
        throw new DomainException("Obra/fonograma selecionada não está liberada. A execução continuará pendente.");

    string? fonogramaIsrc = null;
    string interpretes = "";
    if (cmd.FonogramaId.HasValue)
    {
        var fonoInfo = await _cadastroClient.GetFonogramaByIdAsync(cmd.FonogramaId.Value, ct);
        if (fonoInfo != null)
        {
            fonogramaIsrc = fonoInfo.Isrc;
            interpretes = fonoInfo.Interpretes ?? "";
            if (fonoInfo.Status != "LIBERADO")
                throw new DomainException("Fonograma selecionado não está liberado.");
        }
    }

    // Atualizar execução
    execucao.Resolver(cmd.ObraId, cmd.FonogramaId, obraInfo.Titulo, fonogramaIsrc, obraInfo.Iswc, interpretes);

    await _execucaoRepo.SaveChangesAsync(ct);
    return MapToResponse(execucao);
}
```

### Método `Execucao.Resolver()` — Adição ao domínio

```csharp
// Adicionar à entidade Execucao (F02):
public void Resolver(Guid obraId, Guid? fonogramaId, string obraTitulo,
    string? fonogramaIsrc, string? obraIswc, string interpretes)
{
    ObraId = obraId;
    FonogramaId = fonogramaId;
    ObraTitulo = obraTitulo;
    FonogramaIsrc = fonogramaIsrc;
    ObraIswc = obraIswc;
    Interpretes = interpretes;
    Status = StatusExecucao.Identificada;
    AtualizadoEm = DateTime.UtcNow;
}
```

### ResolverPendentesEmLoteCommandHandler

```csharp
public async Task<ResolverLoteResponse> HandleAsync(ResolverPendentesEmLoteCommand cmd, CancellationToken ct)
{
    // Validar obra LIBERADA (uma vez — é a mesma para todas)
    var obraInfo = await _cadastroClient.GetObraByIdAsync(cmd.ObraId, ct)
        ?? throw new NotFoundException("Obra não encontrada.", cmd.ObraId);
    if (obraInfo.Status != "LIBERADO")
        throw new DomainException("Obra/fonograma selecionada não está liberada.");

    FonogramaResumoDto? fonoInfo = null;
    if (cmd.FonogramaId.HasValue)
    {
        fonoInfo = await _cadastroClient.GetFonogramaByIdAsync(cmd.FonogramaId.Value, ct);
        if (fonoInfo?.Status != "LIBERADO")
            throw new DomainException("Fonograma selecionado não está liberado.");
    }

    int resolvidas = 0;
    var rejeitadas = new List<RejeicaoDto>();

    foreach (var execucaoId in cmd.ExecucaoIds)
    {
        var execucao = await _execucaoRepo.GetByIdComCaptacaoAsync(execucaoId, ct);
        if (execucao == null)
        {
            rejeitadas.Add(new(execucaoId, "Execução não encontrada"));
            continue;
        }
        if (execucao.Status != StatusExecucao.Pendente)
        {
            rejeitadas.Add(new(execucaoId, "Execução já identificada"));
            continue;
        }
        if (execucao.Captacao.Status != StatusCaptacao.Aberta)
        {
            rejeitadas.Add(new(execucaoId, "Captação com status " + execucao.Captacao.Status));
            continue;
        }

        execucao.Resolver(cmd.ObraId, cmd.FonogramaId, obraInfo.Titulo,
            fonoInfo?.Isrc, obraInfo.Iswc, fonoInfo?.Interpretes ?? "");
        resolvidas++;
    }

    await _execucaoRepo.SaveChangesAsync(ct);

    return new ResolverLoteResponse(resolvidas, rejeitadas.Count, rejeitadas);
}
```

### PendentesVerificadorWorker — Background Job

```csharp
public class PendentesVerificadorWorker : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                await VerificarPendentesAsync(scope.ServiceProvider, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Erro no PendentesVerificadorWorker");
            }

            await Task.Delay(TimeSpan.FromMinutes(5), ct);
        }
    }

    private async Task VerificarPendentesAsync(IServiceProvider sp, CancellationToken ct)
    {
        var execucaoRepo = sp.GetRequiredService<IExecucaoRepository>();
        var cadastroClient = sp.GetRequiredService<ICadastroHttpClient>();

        // Buscar execuções PENDENTES que TÊM obraId (vinculadas a obra PENDENTE/BLOQUEADA)
        var pendentes = await execucaoRepo.ListarPendentesComObraIdAsync(ct);
        if (!pendentes.Any()) return;

        // Batch por IDs únicos de obra (não repetir consulta)
        var obrasUnicas = pendentes
            .Select(e => e.ObraId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var statusObras = new Dictionary<Guid, string>();
        foreach (var obraId in obrasUnicas)
        {
            var info = await cadastroClient.GetObraByIdAsync(obraId, ct);
            if (info != null)
                statusObras[obraId] = info.Status;
        }

        // Atualizar execuções cuja obra agora está LIBERADA
        int resolvidas = 0;
        foreach (var execucao in pendentes)
        {
            if (statusObras.TryGetValue(execucao.ObraId, out var status) && status == "LIBERADO")
            {
                // Re-buscar dados atualizados da obra
                var obraInfo = await cadastroClient.GetObraByIdAsync(execucao.ObraId, ct);
                if (obraInfo == null) continue;

                string? fonogramaIsrc = null;
                string interpretes = "";
                if (execucao.FonogramaId.HasValue)
                {
                    var fonoInfo = await cadastroClient.GetFonogramaByIdAsync(execucao.FonogramaId.Value, ct);
                    if (fonoInfo != null)
                    {
                        fonogramaIsrc = fonoInfo.Isrc;
                        interpretes = fonoInfo.Interpretes ?? "";
                        if (fonoInfo.Status != "LIBERADO") continue; // fonograma ainda não liberado
                    }
                }

                execucao.Resolver(execucao.ObraId, execucao.FonogramaId,
                    obraInfo.Titulo, fonogramaIsrc, obraInfo.Iswc, interpretes);
                resolvidas++;
            }
        }

        if (resolvidas > 0)
        {
            await execucaoRepo.SaveChangesAsync(ct);
            _logger.LogInformation("PendentesVerificadorWorker: {Resolvidas} execuções resolvidas automaticamente", resolvidas);
        }
    }
}
```

### Mapeamento de Regras de Negócio

| Regra | Implementação |
|-------|---------------|
| RN-02 | Execuções PENDENTES listadas na tela centralizada |
| RN-04 | Resolver só em captações ABERTAS (ValidarAberta no handler) |
| RN-09 | Re-verificação automática via worker |
| RN-10 | Resolução manual via POST /resolver e /resolver-lote |

### Query de Impacto — SQL conceitual

```sql
SELECT
    COALESCE(e."FonogramaIsrc", e."ObraIswc", 'desconhecido') AS identificador,
    CASE
        WHEN e."FonogramaIsrc" IS NOT NULL THEN 'isrc'
        WHEN e."ObraIswc" IS NOT NULL THEN 'iswc'
        ELSE 'desconhecido'
    END AS tipo_identificador,
    MAX(e."ObraTitulo") AS obra_titulo,
    COUNT(*) AS total_execucoes,
    COUNT(DISTINCT e."CaptacaoId") AS total_captacoes
FROM identificacao."Execucoes" e
WHERE e."Status" = 'Pendente'
GROUP BY identificador, tipo_identificador
ORDER BY total_captacoes DESC
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarPendentesQuery.cs` | Query | Lista centralizada com filtros |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarPendentesQueryHandler.cs` | Handler | Join Execucao+Captacao+Rubrica |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarImpactoPendentesQuery.cs` | Query | Visão agrupada |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Queries/ListarImpactoPendentesQueryHandler.cs` | Handler | GROUP BY com contagem |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendenteCommand.cs` | Command | Resolução individual + validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendenteCommandHandler.cs` | Handler | Valida LIBERADA, resolve |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendentesEmLoteCommand.cs` | Command | Resolução em lote + validator |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Commands/ResolverPendentesEmLoteCommandHandler.cs` | Handler | Loop com rejeição parcial |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ExecucaoPendenteResponse.cs` | DTO | Com dados da captação |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ImpactoPendenteResponse.cs` | DTO | Agrupado |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Responses/ResolverLoteResponse.cs` | DTO | Resolvidas + rejeitadas |
| `services/identificacao-api/2-Application/Identificacao.Application/Pendentes/Services/PendentesVerificadorWorker.cs` | Worker | Re-verificação automática a cada 5min |
| `services/identificacao-api/1-Services/Identificacao.API/Endpoints/PendenteEndpoints.cs` | Endpoint | 4 rotas |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ResolverPendenteCommandHandlerTests.cs` | Teste | Resolução individual |
| `services/identificacao-api/5-Tests/Identificacao.Tests/Application/ResolverPendentesEmLoteCommandHandlerTests.cs` | Teste | Resolução em lote |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Execucao.cs` | Adicionar método `Resolver()` |
| `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IExecucaoRepository.cs` | Adicionar métodos de query de pendentes |
| `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs` | Implementar queries de pendentes + impacto |
| `services/identificacao-api/1-Services/Identificacao.API/Program.cs` | Registrar PendentesVerificadorWorker, mapear PendenteEndpoints |

### Arquivos de Referência

| Caminho | Motivo |
|---------|--------|
| `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/Captacao.cs` | ValidarAberta() |
| `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/CadastroHttpClient.cs` | Reutilizar GetObraById/GetFonogramaById |
| `services/identificacao-api/2-Application/Identificacao.Application/Uploads/Services/CsvProcessorWorker.cs` | Padrão de BackgroundService |
| `tasks/prd-identificacao-execucoes/api-contract.yaml` | Contrato |

---

## Abordagem de Testes

### ResolverPendenteCommandHandlerTests

| Cenário | Tipo |
|---------|------|
| Resolver com obra LIBERADA → IDENTIFICADA | Unit |
| Rejeitar obra não LIBERADA | Unit |
| Rejeitar execução já IDENTIFICADA | Unit |
| Rejeitar captação FECHADA | Unit |
| Resolver com fonograma LIBERADO | Unit |
| Rejeitar fonograma não LIBERADO | Unit |

### ResolverPendentesEmLoteCommandHandlerTests

| Cenário | Tipo |
|---------|------|
| Resolver 3 de 3 com sucesso | Unit |
| Resolver 2 de 3 — 1 captação FECHADA (rejeição parcial) | Unit |
| Rejeitar lote inteiro se obra não LIBERADA | Unit |
| Execução não encontrada → rejeitada (não bloqueia demais) | Unit |

---

## Sequenciamento de Desenvolvimento

| # | Etapa | Dependência |
|---|-------|-------------|
| 1 | Domain — método `Execucao.Resolver()` | Nenhuma |
| 2 | Infra — novos métodos no ExecucaoRepository (queries de pendentes + impacto) | Etapa 1 |
| 3 | Application — Queries (ListarPendentes, ListarImpacto) | Etapa 2 |
| 4 | Application — Commands (Resolver individual + lote) | Etapa 2 |
| 5 | Application — PendentesVerificadorWorker | Etapa 2 |
| 6 | API — PendenteEndpoints + Program.cs | Etapa 3 + 4 + 5 |
| 7 | Testes | Etapa 4 |

---

## Considerações Técnicas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Worker frequency | 5 minutos | Balanceia carga no Cadastro vs responsividade |
| Batch por IDs únicos | Sim | Não repetir consulta para mesma obra |
| Resolver em lote | Resultado parcial | Não falha tudo por causa de 1 execução |
| Query de impacto | GROUP BY no banco | Mais eficiente que agrupar em memória |
| Método Resolver() no domínio | Sim | Encapsula transição de estado |

---

## Stitch — Mockup Obrigatório

| Campo | Valor |
|-------|-------|
| **Projeto** | mcad |
| **ID** | `533156784329699726` |

Telas:
1. Tela de pendentes — lista com filtros, badge de impacto por linha
2. Visão de impacto agrupada — ISRC/ISWC com drill-down por captação
3. Modal de resolução — busca no Cadastro (reutiliza BuscaCadastroAutocomplete)
4. Fluxo de resolução em lote — seleção com checkboxes, confirmação

---

*TechSpec gerada com a skill `flow-techspec-creator`.*
