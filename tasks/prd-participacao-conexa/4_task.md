---
status: completed
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0, 6.0"</unblocks>
</task_context>

# Tarefa 4.0: Infra — Configuration, Migration, ParticipacaoRepository + Fix TitularRepository

## Visão Geral

Mapeamento EF Core (FKs para fonogramas e titulares, nullable Percentual, unique fono+titular+categoria), migration (tabela + coluna PercentuaisDesatualizados em fonogramas), repositório, e fix do TitularRepository.PossuiVinculosAsync.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/ParticipacaoConexaConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/ParticipacaoRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddParticipacoesConexas.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — adicionar `DbSet<ParticipacaoConexa>`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/TitularRepository.cs` — PossuiVinculosAsync: adicionar `|| AnyAsync participacoes_conexas`

## Subtarefas

- [ ] 4.1 Criar `ParticipacaoConexaConfiguration` — tabela `participacoes_conexas`, FKs, DECIMAL(8,4) nullable, unique (FonogramaId+TitularId+Categoria), CHECK constraints
- [ ] 4.2 Adicionar `DbSet<ParticipacaoConexa>` no CadastroDbContext
- [ ] 4.3 Gerar migration: inclui tabela + `ALTER TABLE fonogramas ADD COLUMN "PercentuaisDesatualizados" BOOLEAN NOT NULL DEFAULT FALSE`
- [ ] 4.4 Criar `ParticipacaoRepository` — GetByFonogramaIdAsync (Include Titular), GetByIdAsync, ExisteDuplicataAsync, AddAsync, Delete, SaveChangesAsync
- [ ] 4.5 Fix TitularRepository: `|| await _context.ParticipacoesConexas.AnyAsync(p => p.TitularId == titularId, ct)`
- [ ] 4.6 `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] Tabela `cadastro.participacoes_conexas` criada
- [ ] Coluna `PercentuaisDesatualizados` adicionada a `fonogramas`
- [ ] Unique constraint funciona
- [ ] DELETE /titulares/{id} com participações conexas → 409
