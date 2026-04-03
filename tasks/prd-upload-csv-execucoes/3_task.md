---
status: completed
parallelizable: false
blocked_by: [1.0, 2.0]
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 3.0: Backend — Infrastructure (DbContext, Migration, Repositories)

## Visão Geral

Adicionar DbSets de Upload e ErroUpload, Fluent API configurations, migration incremental e repositórios.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/UploadConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/ErroUploadConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/UploadRepository.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/ErroUploadRepository.cs`
- **Modificar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` (adicionar DbSets)
- **Referência:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/CaptacaoConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Repositories/CaptacaoRepository.cs`

## Subtarefas

- [x] 3.1 Adicionar `DbSet<Upload>` e `DbSet<ErroUpload>` ao IdentificacaoDbContext
- [x] 3.2 Criar `UploadConfiguration` — FK Captacao (CASCADE), índice em CaptacaoId, índice parcial em Status WHERE Processando, conversão Status→string
- [x] 3.3 Criar `ErroUploadConfiguration` — FK Upload (CASCADE), índice em UploadId
- [x] 3.4 Gerar migration: `dotnet ef migrations add AddUploadsEErros`
- [x] 3.5 Criar `UploadRepository` — GetByIdAsync, ListarAsync (paginado, ordenado por CriadoEm DESC), ListarPendentesAsync (WHERE Status = Processando)
- [x] 3.6 Criar `ErroUploadRepository` — AddAsync, AddRangeAsync, ListarPorUploadAsync (paginado)

## Sequenciamento

- Bloqueado por: 1.0, 2.0
- Desbloqueia: 5.0
- Paralelizável: Não

## Detalhes de Implementação

**UploadConfiguration:**
```csharp
builder.HasOne(u => u.Captacao)
    .WithMany()
    .HasForeignKey(u => u.CaptacaoId)
    .OnDelete(DeleteBehavior.Cascade);

builder.Property(u => u.Status).HasConversion<string>();
builder.HasIndex(u => u.CaptacaoId).HasDatabaseName("ix_uploads_captacao");
builder.HasIndex(u => u.Status)
    .HasFilter("\"Status\" = 'Processando'")
    .HasDatabaseName("ix_uploads_status_processando");
```

**UploadRepository.ListarPendentesAsync:**
```csharp
public async Task<IEnumerable<Upload>> ListarPendentesAsync(CancellationToken ct)
{
    return await _context.Uploads
        .Where(u => u.Status == StatusUpload.Processando)
        .OrderBy(u => u.CriadoEm)
        .Include(u => u.Captacao).ThenInclude(c => c.Rubrica)
        .ToListAsync(ct);
}
```

## Critérios de Sucesso (Verificáveis)

- [x] Build: `cd services/identificacao-api && dotnet build`
- [x] Migration gerada com tabelas Uploads e ErrosUpload
- [x] Índice parcial em Status WHERE Processando presente
- [x] FK CASCADE em ambas tabelas
