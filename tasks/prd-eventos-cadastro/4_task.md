---
status: pending
parallelizable: false
blocked_by: ["3.0"]
---

<task_context>
<domain>backend/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>external_apis</dependencies>
<unblocks>"5.0"</unblocks>
</task_context>

# Tarefa 4.0: Infra — IRabbitMqPublisher + RabbitMqPublisher

## Visão Geral

Interface e implementação do publisher RabbitMQ: conexão via connection string do .env, exchange declare `cadastro.events` (topic, durable), publicação com CloudEvents formatter e MessageId.

## Arquivos Envolvidos

- **Criar:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/IRabbitMqPublisher.cs`
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs`
- **Referência:**
  - `tasks/prd-eventos-cadastro/techspec.md` (seção "RabbitMqPublisher")

## Subtarefas

- [ ] 4.1 Instalar NuGet: `RabbitMQ.Client`, `CloudNative.CloudEvents`, `CloudNative.CloudEvents.SystemTextJson` no projeto Infra
- [ ] 4.2 Criar `IRabbitMqPublisher` — PublishAsync(string routingKey, CloudEvent cloudEvent, CancellationToken ct)
- [ ] 4.3 Criar `RabbitMqPublisher`:
  - Conexão via `RABBITMQ_URL` do configuration
  - ExchangeDeclare `cadastro.events` (topic, durable) no construtor
  - PublishAsync: `JsonEventFormatter.EncodeStructuredModeMessage` → body, BasicProperties com MessageId=cloudEvent.Id + Persistent, BasicPublish
  - Implementar IDisposable (close channel + connection)
- [ ] 4.4 `dotnet build`

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet build` compila sem erros
- [ ] RabbitMqPublisher conecta ao RabbitMQ (ou falha graciosamente se indisponível)
- [ ] Exchange `cadastro.events` criada como topic+durable
- [ ] Mensagem publicada em formato CloudEvents JSON (structured mode)
- [ ] MessageId = evento UUID
