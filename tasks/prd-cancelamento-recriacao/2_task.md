---
status: completed
parallelizable: false
blocked_by: [1.0]
---

<task_context>
<domain>identificacao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>"3.0"</unblocks>
</task_context>

# Tarefa 2.0: Backend — Infra (DistribuicaoEventConsumer)

## Visão Geral

Criar o primeiro consumer de RabbitMQ no serviço de Identificação. Consome `distribuicao.rol.processado` e marca a captação como processada, bloqueando cancelamento.

## Arquivos Envolvidos

- **Criar:**
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/DistribuicaoEventConsumer.cs`
- **Referência:**
  - `services/cadastro-api/4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs` (padrão de connection/channel)
  - `services/identificacao-api/4-Infra/Identificacao.Infra/Events/OutboxPublisherWorker.cs` (padrão BackgroundService)

## Subtarefas

- [x] 2.1 Criar `DistribuicaoEventConsumer` como BackgroundService
- [x] 2.2 Declarar queue `identificacao.distribuicao.rol.processado`, bind ao exchange `distribuicao` com routing key `distribuicao.rol.processado`
- [x] 2.3 Ao receber: deserializar evento, buscar captação por ID, chamar `MarcarDistribuicaoProcessada()`, save
- [x] 2.4 Idempotência: se já processada, ignorar (log info)
- [x] 2.5 Error handling: nack com requeue em caso de erro
- [x] 2.6 Logging: log info para processamento bem-sucedido, log warning para captação não encontrada, log error para exceções

## Sequenciamento

- Bloqueado por: 1.0 (método MarcarDistribuicaoProcessada)
- Desbloqueia: 3.0
- Paralelizável: Não

## Detalhes de Implementação

**DistribuicaoEventConsumer:** conforme TechSpec — AsyncEventingBasicConsumer, deserializa `DistribuicaoRolProcessadoEvent`, busca captação, marca processada, ack/nack.

**DTOs do evento:**
```csharp
public record DistribuicaoRolProcessadoEvent(string Type, DistribuicaoRolProcessadoData Data);
public record DistribuicaoRolProcessadoData(Guid CaptacaoId, DateTime ProcessadoEm);
```

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/identificacao-api && dotnet build`
- [ ] Consumer inicia sem erros (com RabbitMQ rodando)
- [ ] Publicar evento manualmente no RabbitMQ → captação marcada como processada
- [ ] Evento duplicado → ignorado (idempotente)
