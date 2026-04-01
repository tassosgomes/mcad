---
status: pending
parallelizable: false
blocked_by: ["7.0"]
---

<task_context>
<domain>backend/testing</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies></dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Testes Unitários — OutboxEvent + Writer + Worker

## Visão Geral

Testes unitários da entidade OutboxEvent, do OutboxEventWriter (mock DbContext) e do OutboxPublisherWorker (mock IRabbitMqPublisher).

## Arquivos Envolvidos

- **Criar:**
  - `5-Tests/Cadastro.UnitTests/Events/OutboxEventTests.cs`
  - `5-Tests/Cadastro.UnitTests/Events/OutboxEventWriterTests.cs`
  - `5-Tests/Cadastro.UnitTests/Events/OutboxPublisherWorkerTests.cs`

## Subtarefas

- [ ] 8.1 **OutboxEventTests:** Criar (campos corretos, PublishedAt=null, Attempts=0), MarcarPublicado (PublishedAt preenchido), IncrementarTentativa (Attempts++), ExcedeuTentativas (false com 9, true com 10)
- [ ] 8.2 **OutboxEventWriterTests:** AddEvent serializa payload como JSON, cria OutboxEvent com type/subject corretos, adiciona ao DbSet (mock/in-memory)
- [ ] 8.3 **OutboxPublisherWorkerTests:** Mock IRabbitMqPublisher. Cenário 3 pendentes → 3 chamadas PublishAsync, 3 MarcarPublicado. Cenário 1 falha → IncrementarTentativa, PublishAsync chamado mas falhou. Cenário evento com 10 tentativas → ignorado (não chama PublishAsync).

## Critérios de Sucesso (Verificáveis)

- [ ] `dotnet test --filter "Namespace~Events"` — todos passam
- [ ] Mínimo 10 testes unitários
