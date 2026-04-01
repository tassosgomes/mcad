---
status: done
parallelizable: false
blocked_by: ["2.0", "3.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>database</dependencies>
<unblocks>"5.0, 6.0, 7.0"</unblocks>
</task_context>

# Tarefa 4.0: Infra — HistoricoBloqueioConfiguration, Migration, Repository + atualizar Configurations

## Visão Geral

Criar config EF e repositório para HistoricoBloqueio. Migration: tabela historico_bloqueios + colunas BloqueioJustificativa e UrlAudio nas tabelas existentes + atualizar CHECK constraints dos enums (+BLOQUEADO).

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/HistoricoBloqueioConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Repositories/HistoricoBloqueioRepository.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddControleStatus.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — +DbSet<HistoricoBloqueio>
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/ObraMusicalConfiguration.cs` — +BloqueioJustificativa VARCHAR(500), atualizar CHECK status (+BLOQUEADO)
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/FonogramaConfiguration.cs` — +UrlAudio VARCHAR(500), +BloqueioJustificativa VARCHAR(500), atualizar CHECK status (+BLOQUEADO)

## Subtarefas

- [x] 4.1 HistoricoBloqueioConfiguration: tabela `historico_bloqueios`, CHECK constraints, índice (EntidadeTipo, EntidadeId)
- [x] 4.2 HistoricoBloqueioRepository: AddAsync, GetByEntidadeAsync (ordenado por DataHora DESC)
- [x] 4.3 Atualizar ObraMusicalConfiguration: +BloqueioJustificativa, CHECK status com BLOQUEADO
- [x] 4.4 Atualizar FonogramaConfiguration: +UrlAudio, +BloqueioJustificativa, CHECK status com BLOQUEADO
- [x] 4.5 +DbSet<HistoricoBloqueio> no CadastroDbContext
- [x] 4.6 Gerar migration + `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [x] `dotnet build` compila sem erros
- [x] Tabela `cadastro.historico_bloqueios` criada
- [x] Colunas BloqueioJustificativa e UrlAudio adicionadas
- [x] CHECK constraints atualizadas com BLOQUEADO
