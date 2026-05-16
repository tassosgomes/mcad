---
status: done
parallelizable: false
blocked_by: ["1.0"]
---

<task_context>
<domain>distribuicao/infra</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>rabbitmq</dependencies>
<unblocks>"4.0"</unblocks>
</task_context>

# Tarefa 2.0: Outbox Pattern — writer, publisher, worker

## Relacionada às User Stories

- Suporte transversal — todas as HUs que publicam eventos (HU-02, HU-05, HU-06, HU-07)

## Visão Geral

Portar a infraestrutura de Outbox Pattern da arrecadacao-api para a distribuicao-api: OutboxEventWriterImpl, RabbitMqPublisher (exchange `distribuicao.events`), OutboxPublisherWorker (scheduled polling). Esta é a primeira implementação de publicação de eventos na distribuicao-api.

## Requisitos

- OutboxEventWriterImpl que serializa payload e persiste na tabela outbox_events
- RabbitMqPublisher que converte OutboxEvent → CloudEvent e publica no exchange `distribuicao.events`
- OutboxPublisherWorker que faz polling a cada 5s, batch de 100, max 10 tentativas
- Exchange `distribuicao.events` (TopicExchange, durable) declarado no RabbitMqConfig
- Configuração no application.yml

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/OutboxEventWriterImpl.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RabbitMqPublisher.java`
  - `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/OutboxPublisherWorker.java`
- **Modificar:**
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/RabbitMqConfig.java` (adicionar exchange distribuicao.events)
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` (adicionar outbox poll interval, exchange name)
- **Referência:**
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxEventWriterImpl.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/RabbitMqPublisher.java`
  - `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxPublisherWorker.java`

## Subtarefas

- [x] 2.1 Criar OutboxEventWriterImpl (serializa payload JSON + persiste)
- [x] 2.2 Criar RabbitMqPublisher (CloudEvent v1.0, source `urn:distribuicao-api`, exchange `distribuicao.events`)
- [x] 2.3 Criar OutboxPublisherWorker (@Scheduled, batch 100, max 10 tentativas)
- [x] 2.4 Adicionar exchange `distribuicao.events` ao RabbitMqConfig
- [x] 2.5 Adicionar config de outbox poll interval ao application.yml
- [x] 2.6 Verificar compilação

## Sequenciamento

- Bloqueado por: 1.0 (entidade OutboxEvent e repositório)
- Desbloqueia: 4.0 (commands usam OutboxEventWriter)
- Paralelizável: Sim, com 3.0

## Detalhes de Implementação

**RabbitMqPublisher** — idêntico à arrecadação mas com source e exchange diferentes:
- Source URN: `urn:distribuicao-api`
- Exchange: `distribuicao.events`
- Routing key: usa o `type` do OutboxEvent (ex: `distribuicao.processo.criado`)

**application.yml additions:**
```yaml
app:
  outbox:
    publisher:
      poll-interval-ms: ${OUTBOX_POLL_INTERVAL_MS:5000}
  rabbitmq:
    exchanges:
      distribuicao: distribuicao.events
```

## Critérios de Sucesso (Verificáveis)

- [x] Build compila: `cd services/distribuicao-api && mvn compile`
- [x] OutboxEventWriterImpl implementa OutboxEventWriter interface
- [x] RabbitMqPublisher serializa CloudEvent v1.0 com source `urn:distribuicao-api`
- [x] OutboxPublisherWorker tem @Scheduled com intervalo configurável
- [x] RabbitMqConfig declara TopicExchange `distribuicao.events` (durable)
