# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implementar persistência JPA/Flyway para `Rubrica` e `OutboxEvent`, incluindo seed idempotente e testes de integração com PostgreSQL Testcontainers.
- Baseline observado: `arrecadacao-infra` ainda não possui mappings, repositories nem migrations; `application.yml` já usa `ddl-auto: validate`.

## Important Decisions
- `AGENTS.md` e `CLAUDE.md` não existem em `/home/tsgomes/mcad`; a execução segue com os demais documentos mandatórios.
- A implementação ficará restrita a `arrecadacao-domain`, `arrecadacao-infra`, `arrecadacao-tests` e tracking/memory desta task.

## Learnings
- O módulo `arrecadacao-tests` já depende de `spring-boot-starter-test` e Testcontainers PostgreSQL, então é o ponto natural para os testes de integração desta task.

## Files / Surfaces
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-infra/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/...`
- `services/arrecadacao-api/arrecadacao-tests/src/test/java/...`

## Errors / Corrections
- `sed` na raiz para `AGENTS.md` e `CLAUDE.md` falhou porque os arquivos não existem no repositório.

## Ready for Next Run
