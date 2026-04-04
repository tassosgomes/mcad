# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implementar o fluxo completo de outbox para rubricas no serviço Java de Arrecadação: escrita atômica, seed idempotente no startup, publicação CloudEvents no RabbitMQ e cobertura unitária/integrada.

## Important Decisions
- A implementação atual de escrita do outbox está embutida em `JpaOutboxEventRepository`; a task exige um `OutboxEventWriterImpl` dedicado, então o repositório ficará responsável por consulta e persistência genérica, e o writer assumirá a serialização/persistência transacional.
- Os testes não devem depender do timing do scheduler; o worker será invocável diretamente e o agendamento ficará por anotação/configuração.

## Learnings
- `AGENTS.md` e `CLAUDE.md` não existem no repositório em `/home/tsgomes/mcad`; a execução está sendo guiada pelos documentos do PRD/TechSpec e pelas skills obrigatórias.
- O diretório `adrs/` da feature existe, mas está vazio nesta execução.

## Files / Surfaces
- `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaOutboxEventRepository.java`
- `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/ArrecadacaoApplication.java`
- `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/RabbitMqConfig.java`
- `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/infra/persistence/RubricaPersistenceIntegrationTest.java`

## Errors / Corrections

## Ready for Next Run
