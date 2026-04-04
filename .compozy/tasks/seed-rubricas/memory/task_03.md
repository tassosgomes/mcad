# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implementar a camada pura de domínio do serviço `arrecadacao-api` com `Rubrica`, `OutboxEvent` e interfaces de repositório/outbox.
- Fechar a task com testes unitários no módulo `arrecadacao-domain` e evidência de cobertura >= 80%.

## Important Decisions
- Os testes desta task ficarão no próprio módulo `arrecadacao-domain` para satisfazer o critério explícito de `mvn clean test` no módulo domain.
- `OutboxEventRepository` foi modelado com `findPending(int limit)` e `existsByTypeAndSubject(String type, String subject)` para cobrir as leituras necessárias nas tasks 04 e 05 sem introduzir escrita fora do `OutboxEventWriter`.

## Learnings
- O módulo `arrecadacao-domain` existe apenas com `pom.xml`; ainda não há `src/main` nem `src/test`.
- Não há `AGENTS.md`, `CLAUDE.md` ou ADRs presentes no repositório/path indicado pela task.
- `mvn clean test jacoco:report` no módulo `arrecadacao-domain` passou com 8 testes verdes e cobertura de instruções acima de 95%.

## Files / Surfaces
- `services/arrecadacao-api/arrecadacao-domain/pom.xml`
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-domain/src/test/java/...`

## Errors / Corrections
- A primeira tentativa de abrir o skill `cy-workflow-memory` usou o path errado; o arquivo correto está em `/home/tsgomes/mcad/.agents/skills/cy-workflow-memory/SKILL.md`.

## Ready for Next Run
- Atualizar `task_03.md` e `_tasks.md` para `completed`; o diff de código está verificado e pronto para revisão manual.
