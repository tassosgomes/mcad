---
status: completed
domain: Domain
type: Feature Implementation
scope: Full
complexity: medium
dependencies:
  - task_02
---

# Task 03: Domain layer — Rubrica, OutboxEvent, interfaces

## Overview

Implementar a camada de domínio pura do serviço Arrecadação: entidades `Rubrica` e `OutboxEvent`, e interfaces de repositório (`RubricaRepository`, `OutboxEventWriter`, `OutboxEventRepository`). Esta camada não tem dependências externas (zero frameworks) e define os contratos que a infra implementa.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC section "Interfaces Principais" and "Modelos de Dados" for exact signatures
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST criar entidade `Rubrica` com campos: id (UUID), sigla (String), nome (String), exigeClassificacao (boolean)
- MUST criar entidade `Rubrica` imutável (sem setters; construtor protegido para JPA)
- MUST criar entidade `OutboxEvent` com: id, type, routingKey, subject, payload, createdAt, publishedAt, attempts
- MUST criar factory method `OutboxEvent.criar()` e métodos `marcarPublicado()`, `incrementarTentativa()`, `excedeuTentativas()`
- MUST definir `MAX_ATTEMPTS = 10` na entidade OutboxEvent
- MUST criar interface `RubricaRepository` com `findAll()` e `findBySigla(String)`
- MUST criar interface `OutboxEventWriter` com `addEvent(String eventType, String subject, Object data)`
- MUST criar interface `OutboxEventRepository` para leitura de eventos pendentes
- MUST manter módulo domain sem dependências externas (apenas Java SE)
</requirements>

## Subtasks

- [x] 3.1 Criar entidade `Rubrica` com construtor, getters e construtor protegido JPA
- [x] 3.2 Criar entidade `OutboxEvent` com factory method, métodos de estado e constante MAX_ATTEMPTS
- [x] 3.3 Criar interface `RubricaRepository` (read-only: findAll, findBySigla)
- [x] 3.4 Criar interfaces `OutboxEventWriter` e `OutboxEventRepository`
- [x] 3.5 Escrever testes unitários para entidades

## Implementation Details

Referência: TechSpec seção "Interfaces Principais" e "Modelos de Dados — Entidade de Domínio".

Padrão equivalente ao .NET: `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs`

### Relevant Files
- `services/cadastro-api/3-Domain/Cadastro.Domain/Entities/OutboxEvent.cs` — referência do OutboxEvent em .NET
- `services/cadastro-api/3-Domain/Cadastro.Domain/Interfaces/IOutboxEventWriter.cs` — referência da interface em .NET

### Dependent Files
- `services/arrecadacao-api/arrecadacao-infra/` — implementará as interfaces (task_04, task_05)
- `services/arrecadacao-api/arrecadacao-application/` — usará RubricaRepository via queries (task_06)

## Deliverables

- `Rubrica.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/`
- `OutboxEvent.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/`
- `RubricaRepository.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/`
- `OutboxEventWriter.java` e `OutboxEventRepository.java` em `arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/`
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `Rubrica` — construtor cria instância com todos os campos corretos
  - [x] `Rubrica` — construtor rejeita argumentos nulos (sigla, nome)
  - [x] `OutboxEvent.criar()` — factory cria evento com id, type, subject, payload, createdAt preenchidos e publishedAt nulo
  - [x] `OutboxEvent.marcarPublicado()` — seta publishedAt para instante atual
  - [x] `OutboxEvent.incrementarTentativa()` — incrementa attempts em 1
  - [x] `OutboxEvent.excedeuTentativas()` — retorna false com attempts < 10, true com attempts >= 10
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- `mvn clean test` no módulo domain passa sem erros
- Entidades Rubrica e OutboxEvent com comportamento correto validado por testes
- Interfaces de repositório definidas sem dependência de frameworks
- Cobertura >= 80% no módulo domain
