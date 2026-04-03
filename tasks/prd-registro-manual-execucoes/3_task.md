---
status: pending
parallelizable: false
blocked_by: [1.0, 2.0]
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Infrastructure (DbContext, Migration, Seeds, Repos, HttpClient)

## Visão Geral

Adicionar ao serviço de Identificação: DbSets de Execução e TipoUtilização, configurations Fluent API, migration incremental, seed de 4 tipos de utilização, repositórios e o HTTP client para comunicação com o Cadastro API.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/ExecucaoConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/TipoUtilizacaoConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/TipoUtilizacaoSeed.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ExecucaoRepository.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/TipoUtilizacaoRepository.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/ExternalServices/CadastroHttpClient.cs`
- **Modificar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` (adicionar DbSets)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs` (implementar `ContarExecucoesAsync` real)
- **Referência:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs` (padrão Fluent API)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/RubricaSeed.cs` (padrão de seed)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs` (padrão de repo)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/ExternalServices/IswcService.cs` (padrão de HttpClient)

## Subtarefas

- [ ] 3.1 Adicionar `DbSet<Execucao>` e `DbSet<TipoUtilizacao>` ao `IdentificacaoDbContext`
- [ ] 3.2 Criar `ExecucaoConfiguration` — FK para Captacao (CASCADE), FK para TipoUtilizacao (SetNull), índice em CaptacaoId e ObraId, TimeOnly para Inicio/Fim
- [ ] 3.3 Criar `TipoUtilizacaoConfiguration` — unique index em Sigla
- [ ] 3.4 Criar `TipoUtilizacaoSeed` com 4 registros (IDs fixos)
- [ ] 3.5 Gerar migration: `dotnet ef migrations add AddExecucoesETiposUtilizacao`
- [ ] 3.6 Criar `ExecucaoRepository` — ListarAsync (filtro status, sort, paginação), GetByIdAsync, ContarPorCaptacao/Identificadas/Pendentes, Add/Remove/SaveChanges
- [ ] 3.7 Criar `TipoUtilizacaoRepository` (ListarAsync, GetByIdAsync)
- [ ] 3.8 Criar `CadastroHttpClient` — BuscarAsync, GetObraByIdAsync, GetFonogramaByIdAsync (com Polly retry)
- [ ] 3.9 Atualizar `CaptacaoRepository.ContarExecucoesAsync` para contar execuções reais (não mais retornar 0)

## Sequenciamento

- Bloqueado por: 1.0 (endpoint de busca no Cadastro), 2.0 (entidades do domínio)
- Desbloqueia: 4.0
- Paralelizável: Não

## Detalhes de Implementação

**ExecucaoConfiguration — pontos críticos:**
```csharp
builder.HasOne(e => e.Captacao)
    .WithMany()
    .HasForeignKey(e => e.CaptacaoId)
    .OnDelete(DeleteBehavior.Cascade);  // Exclui execuções ao excluir captação

builder.HasOne(e => e.TipoUtilizacao)
    .WithMany()
    .HasForeignKey(e => e.TipoUtilizacaoId)
    .OnDelete(DeleteBehavior.SetNull);  // Nullable FK

builder.Property(e => e.Inicio).HasColumnType("time");
builder.Property(e => e.Fim).HasColumnType("time");
builder.Property(e => e.Status).HasConversion<string>();

builder.HasIndex(e => e.CaptacaoId).HasDatabaseName("ix_execucoes_captacao");
builder.HasIndex(e => e.ObraId).HasDatabaseName("ix_execucoes_obra");
```

**TipoUtilizacaoSeed:**
```csharp
public static class TipoUtilizacaoSeed
{
    public static readonly Guid TaId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000001");
    public static readonly Guid TeId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000002");
    public static readonly Guid PeId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000003");
    public static readonly Guid BkId = Guid.Parse("d1e2f3a4-0001-0000-0000-000000000004");

    public static IEnumerable<TipoUtilizacao> GetTipos() => new[]
    {
        TipoUtilizacao.Criar(TaId, "TA", "Tema de Abertura", 1.0m),
        TipoUtilizacao.Criar(TeId, "TE", "Tema de Encerramento", 1.0m),
        TipoUtilizacao.Criar(PeId, "PE", "Performance Cênica", 1.0m),
        TipoUtilizacao.Criar(BkId, "BK", "Background (Música de Fundo)", 0.0833m),
    };
}
```

**CadastroHttpClient — padrão com Polly:**
```csharp
public class CadastroHttpClient : ICadastroHttpClient
{
    private readonly HttpClient _client;

    public CadastroHttpClient(HttpClient client) => _client = client;

    public async Task<BuscaCadastroResponse> BuscarAsync(string query, string? tipo, int size, CancellationToken ct)
    {
        var url = $"/api/v1/busca?q={Uri.EscapeDataString(query)}&tipo={tipo ?? "todos"}&size={size}";
        var response = await _client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BuscaCadastroResponse>(cancellationToken: ct)
            ?? new BuscaCadastroResponse(Enumerable.Empty<ResultadoBuscaDto>());
    }

    public async Task<ObraResumoDto?> GetObraByIdAsync(Guid obraId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/obras/{obraId}", ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ObraResumoDto>(cancellationToken: ct);
    }

    public async Task<FonogramaResumoDto?> GetFonogramaByIdAsync(Guid fonogramaId, CancellationToken ct)
    {
        var response = await _client.GetAsync($"/api/v1/fonogramas/{fonogramaId}", ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FonogramaResumoDto>(cancellationToken: ct);
    }
}
```

**ExecucaoRepository — contadores:**
```csharp
public Task<int> ContarPorCaptacaoAsync(Guid captacaoId, CancellationToken ct)
    => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId, ct);

public Task<int> ContarIdentificadasAsync(Guid captacaoId, CancellationToken ct)
    => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId && e.Status == StatusExecucao.Identificada, ct);

public Task<int> ContarPendentesAsync(Guid captacaoId, CancellationToken ct)
    => _context.Execucoes.CountAsync(e => e.CaptacaoId == captacaoId && e.Status == StatusExecucao.Pendente, ct);
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/identificacao-api && dotnet build`
- [ ] Migration gerada sem erros
- [ ] Seed contém 4 tipos de utilização (TA, TE, PE, BK)
- [ ] FK Execucao→Captacao com ON DELETE CASCADE
- [ ] Índices em CaptacaoId e ObraId presentes na migration
