---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0, 4.0, 5.0"</unblocks>
</task_context>

# Tarefa 2.0: Infra — Configuration, Migration, TitularidadeRepository

## Visão Geral

Mapeamento EF Core (Fluent API com FKs para obras e titulares, unique constraint obra+titular+categoria, CHECK constraints), migration e repositório com CRUD + cálculo de soma.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/TitularidadeAutoralConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularidadeRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddTitularidadesAutorais.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — adicionar `DbSet<TitularidadeAutoral>`
- **Referência:**
  - `tasks/prd-titularidades-autorais/techspec.md` (seções "Schema PostgreSQL", "ITitularidadeRepository")
- **Skills:** `dotnet-architecture` — Repository, Fluent API

## Subtarefas

- [ ] 2.1 Criar `TitularidadeAutoralConfiguration` — tabela `titularidades_autorais`, FKs (ObraId, TitularId), DECIMAL(8,4) para percentual, unique (ObraId+TitularId+Categoria), CHECK constraints
- [ ] 2.2 Adicionar `DbSet<TitularidadeAutoral>` no CadastroDbContext
- [ ] 2.3 Gerar migration: `dotnet ef migrations add AddTitularidadesAutorais`
- [ ] 2.4 Criar `TitularidadeRepository` — GetByObraIdAsync (Include Titular + Associacao), GetByIdAsync, ExisteDuplicataAsync, AddAsync, Update, Delete, CalcularSomaAsync (Sum via EF), SaveChangesAsync
- [ ] 2.5 Testar migration: `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet ef database update` cria tabela `cadastro.titularidades_autorais`
- [ ] Unique constraint (ObraId, TitularId, Categoria) funciona
- [ ] FK para obras_musicais e titulares funciona
- [ ] CHECK Percentual > 0 AND <= 100
