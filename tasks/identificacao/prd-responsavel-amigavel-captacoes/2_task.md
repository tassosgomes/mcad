---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>engine/infra/data/identidade</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0", "5.0", "6.0"</unblocks>
</task_context>

# Tarefa 2.0: Read model UsuarioIdentidade + repositório + DI

## Visão Geral

A tabela `identificacao.usuarios_identidade` já existe (criada por raw SQL na migração `20260511120000_AddUsuariosIdentidade`) e é populada pelo `IdentityUserEventConsumer` via RabbitMQ — mas **não há entidade EF, DbSet nem repositório de leitura**. Esta tarefa cria o **read model** mapeado à tabela existente (sem gerar nem alterar schema) e a porta de leitura `IUsuarioIdentidadeRepository`, que servirá à combo (F1), à resolução de nome no cadastro (F2) e ao backfill (F3).

## Requisitos

- Entidade `UsuarioIdentidade` (read model) com os campos relevantes da tabela.
- Mapeamento EF com `ExcludeFromMigrations()` (EF **não** gerencia o schema da tabela — responsabilidade do consumer/migração existente).
- `Roles` mapeado como `jsonb` (lista de strings) — não usado em filtros desta entrega, mas mapeado para uso futuro.
- Propriedade calculada `NomeExibicao` com cadeia de fallback `DisplayName ?? Username ?? Email ?? LogtoUserId`.
- Interface `IUsuarioIdentidadeRepository` com `ListarAtivosAsync`, `ListarTodosAsync`, `BuscarPorSubjectAsync`.
- Implementação em Infra + `DbSet` no DbContext + registro DI explícito em `Program.cs`.
- **Nenhuma migração de schema é criada.**

## Subtarefas

- [ ] 2.1 Criar `3-Domain/Identificacao.Domain/Identidade/UsuarioIdentidade.cs` (read model). Propriedades: `LogtoUserId` (string, PK), `Username`, `DisplayName`, `Email`, `Roles` (`IReadOnlyList<string>` ou coleção), `IsSuspended` (bool), `DeletedAtUtc` (DateTime?). Adicionar `NomeExibicao` (get-only com fallback).
- [ ] 2.2 Criar interface `3-Domain/Identificacao.Domain/Interfaces/IUsuarioIdentidadeRepository.cs`:
  ```csharp
  Task<IReadOnlyList<UsuarioIdentidade>> ListarAtivosAsync(CancellationToken ct);   // !IsSuspended && DeletedAtUtc == null
  Task<IReadOnlyList<UsuarioIdentidade>> ListarTodosAsync(CancellationToken ct);    // inclui suspensos (backfill)
  Task<UsuarioIdentidade?> BuscarPorSubjectAsync(string logtoUserId, CancellationToken ct);
  ```
- [ ] 2.3 Criar `4-Infra/Identificacao.Infra/Data/Configurations/UsuarioIdentidadeConfiguration.cs`:
  - `ToTable("usuarios_identidade", "identificacao", t => t.ExcludeFromMigrations())`.
  - PK `logto_user_id`; colunas `username`, `display_name`, `email`, `is_suspended`, `deleted_at_utc`.
  - `roles` como `jsonb` → coleção de strings (usar conversão EF existente do projeto ou `HasColumnType("jsonb")`).
  - **Não** mapear `NomeExibicao` como coluna (é calculado).
- [ ] 2.4 Adicionar `public DbSet<UsuarioIdentidade> UsuariosIdentidade => Set<UsuarioIdentidade>();` em `IdentificacaoDbContext.cs`. (A config será auto-descoberta por `ApplyConfigurationsFromAssembly`.)
- [ ] 2.5 Criar `4-Infra/Identificacao.Infra/Repositories/UsuarioIdentidadeRepository.cs`:
  - `ListarAtivosAsync`: `AsNoTracking().Where(u => !u.IsSuspended && u.DeletedAtUtc == null)` (ordenar por nome em memória OU ordenar SQL — ver nota).
  - `ListarTodosAsync`: `AsNoTracking().ToListAsync()`.
  - `BuscarPorSubjectAsync`: `AsNoTracking().FirstOrDefaultAsync(u => u.LogtoUserId == logtoUserId)`.
- [ ] 2.6 Registrar DI em `1-Services/Identificacao.API/Program.cs` junto aos demais repositórios: `builder.Services.AddScoped<IUsuarioIdentidadeRepository, UsuarioIdentidadeRepository>();`.
- [ ] 2.7 Testes unitários do repositório com mock do `DbSet`/contexto (ou focar teste real em integração — ver 7.0). No mínimo, testar a regra de filtro `ListarAtivosAsync` exclui suspensos e excluídos.
- [ ] 2.8 `dotnet build` verde; confirmar que **nenhuma migração nova** é sugerida por `dotnet ef migrations list` (o `ExcludeFromMigrations` + o `Ignore(PendingModelChangesWarning)` já em `Program.cs` devem segurar isso).

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 3.0, 5.0, 6.0
- Paralelizável: **Sim** — arquivos disjuntos da Tarefa 1.0; pode correr em paralelo com ela.

## Detalhes de Implementação

**Atenção ao mapeamento de `roles` (jsonb):** verificar como o projeto já converte `jsonb`↔coleção (ex.: algum `ValueConverter` existente em outra configuração). Se não houver padrão, usar:

```csharp
b.Property(u => u.Roles)
 .HasColumnType("jsonb")
 .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new());
```

**Ordenação por nome:** a tabela não tem uma coluna "nome único". `ListarAtivosAsync` deve ordenar por `DisplayName` (e fallback). Como `NomeExibicao` é calculado em C#, a ordenação por `DisplayName` no SQL já atende na maioria dos casos; o handler (Tarefa 3.0) pode reordenar em memória após aplicar o fallback se necessário.

**Model snapshot:** como a entidade usa `ExcludeFromMigrations`, o EF não tentará criar/dropar a tabela. O `ConfigureWarnings(...Ignore(PendingModelChangesWarning))` já presente em `Program.cs` cobre avisos residuais.

## Critérios de Sucesso

- `UsuarioIdentidade` mapeado à tabela existente **sem gerar migração** (`dotnet ef migrations list` inalterado).
- `IUsuarioIdentidadeRepository` registrado e injetável; consultas `AsNoTracking`.
- `ListarAtivosAsync` retorna apenas `!IsSuspended && DeletedAtUtc == null`.
- `NomeExibicao` aplica corretamente o fallback `DisplayName ?? Username ?? Email ?? LogtoUserId`.
- Build verde; unitários do filtro de ativos passando.
