---
status: done
parallelizable: false
blocked_by: ["2.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0, 6.0, 7.0"</unblocks>
</task_context>

# Tarefa 3.0: Infra — TitularConfiguration, Migration e TitularRepository

## Relacionada às User Stories

- [HU-03] Buscar na listagem (direta — paginação + filtros)

## Visão Geral

Implementar o mapeamento EF Core (Fluent API com HasConversion para VOs), migration (tabela titulares + pg_trgm + índices), e repositório com paginação server-side, filtros dinâmicos (ILike, Contains) e ordenação.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/TitularConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddTitulares.cs` (gerado via `dotnet ef`)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — adicionar `DbSet<Titular>` + `ApplyConfiguration(new TitularConfiguration())`
- **Referência:**
  - `tasks/prd-gestao-titulares/techspec.md` (seções "Schema PostgreSQL", "Paginação + Filtros", "EF Core Configuration")
- **Skills:** `dotnet-architecture` — Repository, DbContext; `dotnet-performance` — AsNoTracking, índices

## Subtarefas

- [ ] 3.1 Criar `TitularConfiguration` com HasConversion para Cpf, Cnpj, CaeIpi (record → string → record)
- [ ] 3.2 Configurar FK para Associacao, unique indexes parciais (Cpf WHERE NOT NULL, Cnpj WHERE NOT NULL), CHECK constraint tipo↔documento
- [ ] 3.3 Adicionar `DbSet<Titular>` no CadastroDbContext
- [ ] 3.4 Gerar migration: `dotnet ef migrations add AddTitulares` (inclui `CREATE EXTENSION IF NOT EXISTS pg_trgm` + índice trigram no nome)
- [ ] 3.5 Criar `TitularRepository` com ListarAsync (paginação + filtros + ordenação dinâmica), GetByIdAsync (Include Associacao), ExisteDocumentoAsync, AddAsync, Update, Delete, PossuiVinculosAsync, SaveChangesAsync
- [ ] 3.6 Testar migration: `dotnet ef database update`

## Detalhes de Implementação

### HasConversion (VOs)
```csharp
builder.Property(t => t.Cpf)
    .HasConversion(cpf => cpf != null ? cpf.Valor : null, valor => valor != null ? Cpf.Create(valor) : null)
    .HasColumnName("Cpf").HasMaxLength(11);
```

### Filtros (ILike para nome, Contains para documento)
```csharp
if (!string.IsNullOrWhiteSpace(filtro.Nome))
    query = query.Where(t => EF.Functions.ILike(t.Nome, $"%{filtro.Nome}%"));
```

### Ordenação dinâmica (switch no sort string, prefixo `-` para DESC)

### PossuiVinculosAsync — inicialmente retorna `false` (tabelas de vínculo não existem ainda, serão F04/F06)

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet ef database update` executa sem erros
- [ ] Tabela `cadastro.titulares` criada com FK, unique indexes parciais e CHECK constraint
- [ ] Extensão `pg_trgm` ativa no banco
- [ ] Índice trigram no campo Nome funciona (`EXPLAIN ANALYZE SELECT ... WHERE "Nome" ILIKE '%test%'`)
