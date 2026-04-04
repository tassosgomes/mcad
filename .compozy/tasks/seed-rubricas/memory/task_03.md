# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implementar a camada pura de domínio do serviço `arrecadacao-api` com `Rubrica`, `OutboxEvent` e interfaces de repositório/outbox.
- Fechar a task com testes unitários no módulo `arrecadacao-domain` e evidência de cobertura >= 80%.

## Important Decisions
- Os testes desta task ficarão no próprio módulo `arrecadacao-domain` para satisfazer o critério explícito de `mvn clean test` no módulo domain.

## Learnings
- O módulo `arrecadacao-domain` existe apenas com `pom.xml`; ainda não há `src/main` nem `src/test`.
- Não há `AGENTS.md`, `CLAUDE.md` ou ADRs presentes no repositório/path indicado pela task.

## Files / Surfaces
- `services/arrecadacao-api/arrecadacao-domain/pom.xml`
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-domain/src/test/java/...`

## Errors / Corrections
- A primeira tentativa de abrir o skill `cy-workflow-memory` usou o path errado; o arquivo correto está em `/home/tsgomes/mcad/.agents/skills/cy-workflow-memory/SKILL.md`.

## Ready for Next Run
