---
status: completed
parallelizable: false
blocked_by: [2.0]
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Infrastructure (DbContext, Migrations, Seeds, Repositórios)

## Visão Geral

Implementar a camada de persistência: DbContext com schema isolado `identificacao`, configurações Fluent API (incluindo partial unique index para RN-01), migration inicial, seed de 7 rubricas e repositórios de Captação e Rubrica.

## Requisitos

- DbContext com schema `identificacao` isolado
- Fluent API configurations para Captacao e Rubrica
- Partial unique index para unicidade rubrica+período (RN-01)
- Migration inicial com ambas tabelas
- Seed de 7 rubricas com IDs fixos
- Repositório de Captação com filtros, paginação e sort
- Repositório de Rubrica (read-only)

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/RubricaConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Seeds/RubricaSeed.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/RubricaRepository.cs`
- **Referência:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` (padrão DbContext)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs` (padrão de filtros/sort/paginação)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` (padrão de seed)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/TitularConfiguration.cs` (padrão de Fluent API)

## Subtarefas

- [x] 3.1 Criar `IdentificacaoDbContext` com DbSets de Captacao e Rubrica, schema `identificacao`
- [x] 3.2 Criar `CaptacaoConfiguration` — FK para Rubrica, partial unique index, column types
- [x] 3.3 Criar `RubricaConfiguration` — unique index em Sigla, column types
- [x] 3.4 Criar `RubricaSeed` com 7 rubricas (IDs fixos UUID)
- [x] 3.5 Gerar migration inicial: `dotnet ef migrations add InitialCreate`
- [x] 3.6 Criar `CaptacaoRepository` com ListarAsync (filtros, sort, paginação), GetByIdAsync, ExisteAtivaParaRubricaPeriodoAsync, ContarExecucoesAsync
- [x] 3.7 Criar `RubricaRepository` (ListarAsync, GetByIdAsync)

## Sequenciamento

- Bloqueado por: 2.0
- Desbloqueia: 4.0
- Paralelizável: Não

## Detalhes de Implementação

**IdentificacaoDbContext.cs:**
```csharp
public class IdentificacaoDbContext : DbContext
{
    public DbSet<Captacao> Captacoes => Set<Captacao>();
    public DbSet<Rubrica> Rubricas => Set<Rubrica>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("identificacao");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(IdentificacaoDbContext).Assembly);
    }
}
```

**CaptacaoConfiguration — Partial Unique Index (RN-01):**
```csharp
builder.HasIndex(c => new { c.RubricaId, c.Periodo })
    .IsUnique()
    .HasFilter("\"Status\" != 'Cancelada'")
    .HasDatabaseName("uq_captacoes_rubrica_periodo_ativa");
```

**Seed de Rubricas — 7 registros com IDs fixos:**
```csharp
public static class RubricaSeed
{
    public static readonly Guid RadioId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000001");
    public static readonly Guid TvAbertaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000002");
    public static readonly Guid TvFechadaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000003");
    public static readonly Guid CinemaId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000004");
    public static readonly Guid VodId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000005");
    public static readonly Guid StreamingAudioId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000006");
    public static readonly Guid ShowId = Guid.Parse("b1a2c3d4-0001-0000-0000-000000000007");

    public static IEnumerable<Rubrica> GetRubricas() => new[]
    {
        Rubrica.Criar(RadioId, "RADIO", "Rádio AM/FM", false),
        Rubrica.Criar(TvAbertaId, "TV_ABERTA", "TV Aberta", true),
        Rubrica.Criar(TvFechadaId, "TV_FECHADA", "TV Fechada", true),
        Rubrica.Criar(CinemaId, "CINEMA", "Cinema", true),
        Rubrica.Criar(VodId, "VOD", "Streaming Vídeo (VOD)", true),
        Rubrica.Criar(StreamingAudioId, "STREAMING_AUDIO", "Streaming Áudio", false),
        Rubrica.Criar(ShowId, "SHOW", "Show", false),
    };
}
```

**CaptacaoRepository — Sort dinâmico:**
```csharp
query = filtro.Sort switch
{
    "periodo" => query.OrderBy(c => c.Periodo),
    "-periodo" => query.OrderByDescending(c => c.Periodo),
    "criadoEm" => query.OrderBy(c => c.CriadoEm),
    "-criadoEm" => query.OrderByDescending(c => c.CriadoEm),
    "rubrica" => query.OrderBy(c => c.Rubrica.Nome),
    "-rubrica" => query.OrderByDescending(c => c.Rubrica.Nome),
    _ => query.OrderByDescending(c => c.Periodo)
};
```

**ExisteAtivaParaRubricaPeriodoAsync:**
```csharp
public async Task<bool> ExisteAtivaParaRubricaPeriodoAsync(Guid rubricaId, DateOnly periodo, Guid? excluirId, CancellationToken ct)
{
    return await _context.Captacoes
        .Where(c => c.RubricaId == rubricaId && c.Periodo == periodo && c.Status != StatusCaptacao.Cancelada)
        .Where(c => excluirId == null || c.Id != excluirId)
        .AnyAsync(ct);
}
```

**Convenções:**
- `AsNoTracking()` em todas as queries de leitura
- `Include(c => c.Rubrica)` nas queries que retornam Captacao
- Paginação: `Skip((Page-1)*Size).Take(Size)`
- Retorno de lista: `(IEnumerable<Captacao> Items, int Total)`

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/identificacao-api && dotnet build`
- [x] Migration gerada sem erros: verifica que arquivo de migration existe
- [x] Seed contém exatamente 7 rubricas
- [x] Partial unique index presente na migration (filtro `WHERE Status != 'Cancelada'`)
