---
status: pending
parallelizable: true
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"4.0, 5.0, 6.0"</unblocks>
</task_context>

# Tarefa 2.0: Infra — ObraMusicalConfiguration, Migration e ObraRepository

## Visão Geral

Mapeamento EF Core (Fluent API com self-referencing FK para depuração), migration (tabela obras_musicais + pg_trgm índice no título + unique parcial no ISWC), e repositório com paginação + filtros + ordenação.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/ObraMusicalConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ObraRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddObras.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — adicionar `DbSet<ObraMusical>`
- **Referência:**
  - `tasks/prd-gestao-obras/techspec.md` (seções "Schema PostgreSQL", "Interface IObraRepository")
  - `4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs` (padrão filtros/paginação)
- **Skills:** `dotnet-architecture`, `dotnet-performance`

## Subtarefas

- [ ] 2.1 Criar `ObraMusicalConfiguration` — tabela `obras_musicais`, enums como string, self-referencing FK `ObraDepuradaParaId`, unique parcial no ISWC (`WHERE "Iswc" IS NOT NULL`), CHECK constraints tipo e status
- [ ] 2.2 Adicionar `DbSet<ObraMusical>` no CadastroDbContext
- [ ] 2.3 Gerar migration: `dotnet ef migrations add AddObras`
- [ ] 2.4 Criar `ObraRepository` — ListarAsync (paginação + 5 filtros + ordenação dinâmica), GetByIdAsync, ExisteIswcAsync, AddAsync, Update, Delete, PossuiVinculosAsync (inicialmente false — tabelas F04/F05 futuras), SaveChangesAsync
- [ ] 2.5 Testar migration: `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet ef database update` cria tabela `cadastro.obras_musicais`
- [ ] Unique index parcial no ISWC funciona (permite múltiplos NULL)
- [ ] Self-referencing FK `ObraDepuradaParaId` funciona
- [ ] Índice trigram no título funciona
