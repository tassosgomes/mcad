---
status: pending
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>low</complexity>
<dependencies>database</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Infra — OutboxEventConfiguration + Migration

## Visão Geral

Mapeamento EF Core para OutboxEvent (JSONB para Payload, índice parcial para pendentes) e migration.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Configurations/OutboxEventConfiguration.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/Migrations/XXXX_AddOutboxEvents.cs` (gerado)
- **Modificar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Data/CadastroDbContext.cs` — +DbSet<OutboxEvent>

## Subtarefas

- [ ] 2.1 OutboxEventConfiguration: tabela `outbox_events`, Type VARCHAR(100), RoutingKey VARCHAR(100), Subject VARCHAR(50), Payload JSONB, CreatedAt, PublishedAt nullable, Attempts default 0. Índice parcial: WHERE PublishedAt IS NULL AND Attempts < 10.
- [ ] 2.2 +DbSet<OutboxEvent> no CadastroDbContext
- [ ] 2.3 Gerar migration + `dotnet ef database update`

## Critérios de Sucesso (Verificáveis)

- [ ] Tabela `cadastro.outbox_events` criada
- [ ] Índice parcial funciona (EXPLAIN com filtro PublishedAt IS NULL)
- [ ] Payload como JSONB (não TEXT)
