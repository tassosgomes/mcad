---
status: done
parallelizable: true
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 4.0: Camada Infra — DbContext, Migration com Seed e Repository

## Relacionada às User Stories

- [HU-02] Associações disponíveis no startup (direta — seed no banco)

## Visão Geral

Implementar a camada de infraestrutura: DbContext com schema `cadastro`, Fluent API configuration, EF Core Migration com seed das 7 associações (HasData com UUIDs determinísticos) e repositório read-only.

## Requisitos

- DbContext configurado para schema `cadastro`
- Fluent API mapping da entidade Associacao
- Seed com HasData — 7 associações com UUIDs fixos e CNPJs reais
- Repositório com AsNoTracking em todas as queries
- Migration gerada e testável

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/AssociacaoConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/AssociacaoRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/` (gerado via dotnet ef)
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/Associacao.cs`
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IAssociacaoRepository.cs`
  - `tasks/prd-seed-associacoes/prd.md` (dados das 7 associações com CNPJs)
- **Skills para consultar:**
  - `dotnet-architecture` — Repository Pattern, DbContext, UnitOfWork
  - `dotnet-performance` — AsNoTracking para queries de leitura

## Subtarefas

- [ ] 4.1 Criar `CadastroDbContext` com `HasDefaultSchema("cadastro")`
- [ ] 4.2 Criar `AssociacaoConfiguration` (Fluent API: tabela, colunas, constraints unique)
- [ ] 4.3 Criar `AssociacaoSeed` com HasData — 7 registros, UUIDs determinísticos
- [ ] 4.4 Criar `AssociacaoRepository` implementando `IAssociacaoRepository` com AsNoTracking
- [ ] 4.5 Gerar migration: `dotnet ef migrations add InitialCreate`
- [ ] 4.6 Testar migration: `dotnet ef database update`

## Sequenciamento

- Bloqueado por: 3.0
- Desbloqueia: 6.0
- Paralelizável: Sim — pode executar em paralelo com 5.0

## Detalhes de Implementação

### Dados do Seed (UUIDs determinísticos)

```csharp
public static class AssociacaoSeed
{
    public static readonly Guid AbramusId = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    public static readonly Guid AmarId = Guid.Parse("b2c3d4e5-f6a7-8901-bcde-f12345678901");
    public static readonly Guid AssimId = Guid.Parse("c3d4e5f6-a7b8-9012-cdef-123456789012");
    public static readonly Guid SbacemId = Guid.Parse("d4e5f6a7-b8c9-0123-defa-234567890123");
    public static readonly Guid SicamId = Guid.Parse("e5f6a7b8-c9d0-1234-efab-345678901234");
    public static readonly Guid SocinproId = Guid.Parse("f6a7b8c9-d0e1-2345-fabc-456789012345");
    public static readonly Guid UbcId = Guid.Parse("a7b8c9d0-e1f2-3456-abcd-567890123456");

    public static Associacao[] GetSeedData() => new[]
    {
        new Associacao(AbramusId, "Associação Brasileira de Música e Artes", "ABRAMUS", "50.997.063/0001-32"),
        new Associacao(AmarId, "Associação de Músicos, Arranjadores e Regentes", "AMAR", "30.713.325/0001-82"),
        new Associacao(AssimId, "Associação de Intérpretes e Músicos", "ASSIM", "43.985.563/0001-99"),
        new Associacao(SbacemId, "Sociedade Brasileira de Autores, Compositores e Escritores de Música", "SBACEM", "33.780.222/0001-23"),
        new Associacao(SicamId, "Sociedade Independente de Compositores e Autores Musicais", "SICAM", "62.092.010/0001-51"),
        new Associacao(SocinproId, "Sociedade Brasileira de Administração e Proteção de Direitos Intelectuais", "SOCINPRO", "33.748.146/0001-79"),
        new Associacao(UbcId, "União Brasileira de Compositores", "UBC", "33.576.166/0001-00"),
    };
}
```

### Configuration (Fluent API)

```csharp
builder.ToTable("associacoes");
builder.HasKey(a => a.Id);
builder.Property(a => a.Nome).HasMaxLength(200).IsRequired();
builder.Property(a => a.Sigla).HasMaxLength(20).IsRequired();
builder.Property(a => a.Cnpj).HasMaxLength(18).IsRequired().IsFixedLength();
builder.HasIndex(a => a.Sigla).IsUnique();
builder.HasIndex(a => a.Cnpj).IsUnique();
builder.HasData(AssociacaoSeed.GetSeedData());
```

### Repository

```csharp
public class AssociacaoRepository : IAssociacaoRepository
{
    private readonly CadastroDbContext _context;

    public AssociacaoRepository(CadastroDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Associacao>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _context.Associacoes
            .AsNoTracking()
            .OrderBy(a => a.Sigla)
            .ToListAsync(cancellationToken);
    }

    public async Task<Associacao?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _context.Associacoes
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }
}
```

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Migration gerada em `Data/Migrations/`
- [ ] `dotnet ef database update` executa sem erros no banco mcad
- [ ] Query `SELECT count(*) FROM cadastro.associacoes` retorna 7
- [ ] Query `SELECT sigla FROM cadastro.associacoes ORDER BY sigla` retorna as 7 siglas
- [ ] Executar migration duas vezes não gera erros (idempotente)
