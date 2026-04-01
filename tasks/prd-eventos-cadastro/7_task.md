---
status: pending
parallelizable: false
blocked_by: ["5.0", "6.0"]
---

<task_context>
<domain>backend/api</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: API — Program.cs (DI + AddHostedService + env vars + .env.example)

## Visão Geral

Registrar todos os novos serviços no DI: IOutboxEventWriter, IRabbitMqPublisher (singleton), AddHostedService<OutboxPublisherWorker>. Ler variáveis de ambiente RABBITMQ_URL e OUTBOX_POLL_INTERVAL_SECONDS.

## Arquivos Envolvidos

- **Modificar:**
  - `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — +IOutboxEventWriter (scoped), +IRabbitMqPublisher (singleton), +AddHostedService<OutboxPublisherWorker>, +ler RABBITMQ_URL + OUTBOX_POLL_INTERVAL do env
  - `services/cadastro-api/.env.example` — +RABBITMQ_URL=amqp://guest:guest@localhost:5672, +OUTBOX_POLL_INTERVAL_SECONDS=5

## Subtarefas

- [ ] 7.1 Program.cs: `builder.Services.AddScoped<IOutboxEventWriter, OutboxEventWriter>();`
- [ ] 7.2 Program.cs: `builder.Services.AddSingleton<IRabbitMqPublisher, RabbitMqPublisher>();` (singleton — conexão persistente)
- [ ] 7.3 Program.cs: `builder.Services.AddHostedService<OutboxPublisherWorker>();`
- [ ] 7.4 Program.cs: ler `RABBITMQ_URL` e `OUTBOX_POLL_INTERVAL_SECONDS` do env (com defaults)
- [ ] 7.5 .env.example: adicionar RABBITMQ_URL e OUTBOX_POLL_INTERVAL_SECONDS
- [ ] 7.6 Testar: `dotnet run` inicia sem erros, worker loga "OutboxPublisherWorker started"

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] `dotnet run` inicia — worker loga no console
- [ ] Se RabbitMQ indisponível: app inicia mas worker loga warning (não crasha)
- [ ] .env.example contém RABBITMQ_URL e OUTBOX_POLL_INTERVAL_SECONDS
