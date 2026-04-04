---
status: pending
domain: Infrastructure
type: Feature Implementation
scope: Full
complexity: high
dependencies:
  - task_04
---

# Task 05: Infra events — Outbox + RabbitMQ

## Overview

Implementar o Outbox Pattern completo em Java: `OutboxEventWriterImpl` para escrita atômica de eventos, `OutboxSeedService` para detectar rubricas sem evento publicado no startup, `OutboxPublisherWorker` para polling e publicação, e `RabbitMqPublisher` para envio de CloudEvents ao RabbitMQ. Esta é a primeira implementação do Outbox Pattern em Java no projeto — o equivalente funcional do que existe em .NET no Cadastro.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC sections "Outbox Seed Service", "Pontos de Integração — RabbitMQ"
- REFERENCE .NET implementation in services/cadastro-api/4-Infra/Cadastro.Infra/Events/ as functional reference
- PRD requirements: RF-05, RF-06, RF-07, RF-08, RF-09
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST implementar `OutboxEventWriterImpl` que serializa payload JSON e persiste `OutboxEvent` via JPA (mesma transação do caller)
- MUST implementar `OutboxSeedService` com `@EventListener(ApplicationReadyEvent.class)` e `@Transactional` que detecta rubricas sem evento publicado e insere na outbox
- MUST implementar `OutboxPublisherWorker` com `@Scheduled` (default 5s, configurável) que faz poll de eventos pendentes (batch 100), publica no RabbitMQ, e marca como publicado
- MUST implementar `RabbitMqPublisher` que declara exchange `arrecadacao.events` (topic, durable) e publica CloudEvents 1.0 structured JSON
- MUST usar `io.cloudevents:cloudevents-json-jackson` para serialização CloudEvents
- MUST usar source `urn:arrecadacao-api` nos CloudEvents
- MUST garantir at-least-once: retry com max 10 tentativas, log de falhas sem parar worker
- MUST ser idempotente: rubricas com evento já publicado não geram duplicatas (RF-08)
- MUST criar `RabbitMqConfig` para declarar exchange
</requirements>

## Subtasks

- [ ] 5.1 Implementar `OutboxEventWriterImpl` (serialização JSON + persistência JPA)
- [ ] 5.2 Implementar `OutboxSeedService` (detecção de rubricas sem evento no startup)
- [ ] 5.3 Implementar `OutboxPublisherWorker` (@Scheduled polling + batch processing)
- [ ] 5.4 Implementar `RabbitMqPublisher` (CloudEvents + exchange topic)
- [ ] 5.5 Criar `RabbitMqConfig` para declaração do exchange `arrecadacao.events`
- [ ] 5.6 Escrever testes unitários e de integração

## Implementation Details

Referência principal: TechSpec seções "Outbox Seed Service" e "Pontos de Integração — RabbitMQ".

Referência funcional .NET:
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs` — escrita atômica
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` — polling 5s, batch 100, retry
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs` — CloudEvents structured JSON, exchange topic durable

Payload do evento `arrecadacao.rubrica.criada`: `{ sigla, nome, exigeClassificacao }`

### Relevant Files
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs` — referência .NET do writer
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` — referência .NET do worker
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/RabbitMqPublisher.cs` — referência .NET do publisher
- `services/cadastro-api/4-Infra/Cadastro.Infra/Events/IRabbitMqPublisher.cs` — interface .NET

### Dependent Files
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/OutboxEvent.java` — entidade (task_03)
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/OutboxEventWriter.java` — interface (task_03)
- `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/` — repositórios JPA (task_04)

## Deliverables

- `OutboxEventWriterImpl.java` em infra/events/
- `OutboxSeedService.java` em infra/events/
- `OutboxPublisherWorker.java` em infra/events/
- `RabbitMqPublisher.java` em infra/events/
- `RabbitMqConfig.java` em api/config/ ou infra/config/
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests with Testcontainers PostgreSQL + RabbitMQ **(REQUIRED)**

## Tests

- Unit tests (Mockito):
  - [ ] `OutboxEventWriterImpl` — serializa payload para JSON e persiste OutboxEvent via repositório
  - [ ] `OutboxSeedService` — detecta 3 rubricas sem evento e cria 3 registros outbox; com todas publicadas, não cria nenhum
  - [ ] `OutboxPublisherWorker` — processa batch de eventos pendentes, marca como publicados
  - [ ] `OutboxPublisherWorker` — falha em 1 evento incrementa tentativa sem parar batch
  - [ ] `OutboxPublisherWorker` — pula eventos com tentativas >= 10
- Integration tests (Testcontainers PostgreSQL + RabbitMQ):
  - [ ] Após startup com 7 rubricas sem eventos, OutboxSeedService cria 7 registros na outbox
  - [ ] Após OutboxSeedService + OutboxPublisherWorker executar, 7 eventos publicados no exchange `arrecadacao.events`
  - [ ] Eventos no RabbitMQ seguem formato CloudEvents (specversion, source, type, data)
  - [ ] Reexecução do OutboxSeedService não gera eventos duplicados (RF-08)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- 7 eventos `arrecadacao.rubrica.criada` publicados no RabbitMQ após startup
- CloudEvents com source `urn:arrecadacao-api` e payload correto
- Idempotência: restart não gera duplicatas
- At-least-once: falhas são retried até MAX_ATTEMPTS
