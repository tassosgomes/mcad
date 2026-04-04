---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>high</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>"2.0, 3.0"</unblocks>
</task_context>

# Tarefa 1.0: Backend — Outbox Pattern (entidade, writer, publisher, worker, RabbitMQ)

## Visão Geral

Introduzir o Outbox Pattern no serviço de Identificação, copiando o padrão do Cadastro (F08). Inclui entidade OutboxEvent, configuration, migration, writer, RabbitMQ publisher e background worker. Usado por F05 (rol.fechado) e F06 (rol.cancelado).

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Entities/OutboxEvent.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IOutboxEventWriter.cs`
  - `services/identificacao-api/3-Domain/Identificacao.Domain/Interfaces/IRabbitMqPublisher.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/Configurations/OutboxEventConfiguration.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxEventWriter.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/RabbitMqPublisher.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxPublisherWorker.cs`
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/EventTypes.cs`
- **Modificar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Data/IdentificacaoDbContext.cs` (DbSet OutboxEvent)
  - `services/identificacao-api/.env.example` (vars RabbitMQ)
- **Referência:**
  - `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/` (todo o diretório)
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` (registro RabbitMQ)

## Subtarefas

- [ ] 1.1 Copiar entidade `OutboxEvent` do Cadastro (factory Criar, MarcarPublicado, IncrementarTentativa, ExcedeuTentativas)
- [ ] 1.2 Criar `IOutboxEventWriter` + `OutboxEventWriter` (AddEvent ao DbContext)
- [ ] 1.3 Criar `IRabbitMqPublisher` + `RabbitMqPublisher` (publica no RabbitMQ)
- [ ] 1.4 Criar `OutboxPublisherWorker` (BackgroundService — poll, publish, mark)
- [ ] 1.5 Criar `EventTypes` com constantes: `identificacao.rol.fechado`, `identificacao.rol.cancelado`
- [ ] 1.6 Criar `OutboxEventConfiguration` (Fluent API — índice parcial WHERE PublishedAt IS NULL)
- [ ] 1.7 Gerar migration: `dotnet ef migrations add AddOutboxEvents`
- [ ] 1.8 Adicionar DbSet<OutboxEvent> ao IdentificacaoDbContext
- [ ] 1.9 Atualizar `.env.example` com `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_VHOST`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD`

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 3.0 (e F06 inteira)
- Paralelizável: Sim (com 5.0 e 6.0)

## Detalhes de Implementação

**Copiar do Cadastro sem alterações significativas.** Única mudança: namespace `Identificacao.*` em vez de `Cadastro.*`.

**EventTypes.cs:**
```csharp
public static class EventTypes
{
    public const string RolFechado = "identificacao.rol.fechado";
    public const string RolCancelado = "identificacao.rol.cancelado";
}
```

**Program.cs — registros (feito na task 4.0, mas documentado aqui):**
```csharp
builder.Services.AddScoped<IOutboxEventWriter, OutboxEventWriter>();
builder.Services.AddSingleton<IRabbitMqPublisher>(sp => new RabbitMqPublisher(rabbitHost, rabbitPort, rabbitVhost, rabbitUser, rabbitPassword));
builder.Services.AddHostedService<OutboxPublisherWorker>();
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Migration gerada com tabela outbox_events no schema identificacao
- [ ] Índice parcial WHERE PublishedAt IS NULL presente
- [ ] Worker compila e inicia sem erros (com RabbitMQ rodando)
