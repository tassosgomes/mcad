---
status: completed
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

# Tarefa 2.0: Infra — FonogramaConfiguration, Migration, FonogramaRepository

## Visão Geral

Mapeamento EF Core com HasConversion para Isrc VO, self-referencing FK, unique parcial no ISRC, migration e repositório com paginação + filtros + GetByObraIdAsync (sem paginação).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/FonogramaConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/FonogramaRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddFonogramas.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — adicionar `DbSet<Fonograma>`
- **Referência:**
  - `tasks/prd-gestao-fonogramas/techspec.md` (seções "Schema", "HasConversion")
  - `4-Infra/.../Configurations/ObraMusicalConfiguration.cs` (padrão self-ref FK)
- **Skills:** `dotnet-architecture`, `dotnet-performance`

## Subtarefas

- [x] 2.1 Criar `FonogramaConfiguration` — HasConversion Isrc (record → string → record), FK ObraId, self-ref FK FonogramaDepuradoParaId, unique parcial ISRC, CHECK status, DateOnly para datas
- [x] 2.2 Adicionar `DbSet<Fonograma>` no CadastroDbContext
- [x] 2.3 Gerar migration: `dotnet ef migrations add AddFonogramas`
- [x] 2.4 Criar `FonogramaRepository` — ListarAsync (paginação + filtros incluindo ObraTitulo via ILike no Join), GetByObraIdAsync (Include Obra, sem paginação), GetByIdAsync (Include Obra), ExisteIsrcAsync (2 overloads), AddAsync, Update, Delete, SaveChangesAsync
- [x] 2.5 Testar migration: `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] `dotnet ef database update` cria tabela `cadastro.fonogramas`
- [x] HasConversion Isrc funciona (persiste string 12 chars, reconstrói VO)
- [x] Unique parcial no ISRC funciona
- [x] FK para obras_musicais funciona
