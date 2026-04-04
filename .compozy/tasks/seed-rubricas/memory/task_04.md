# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Implementar persistência JPA/Flyway para `Rubrica` e `OutboxEvent`, incluindo seed idempotente e testes de integração com PostgreSQL Testcontainers.
- Baseline observado: `arrecadacao-infra` ainda não possui mappings, repositories nem migrations; `application.yml` já usa `ddl-auto: validate`.

## Important Decisions
- `AGENTS.md` e `CLAUDE.md` não existem em `/home/tsgomes/mcad`; a execução segue com os demais documentos mandatórios.
- A implementação ficará restrita a `arrecadacao-domain`, `arrecadacao-infra`, `arrecadacao-tests` e tracking/memory desta task.
- `JpaOutboxEventRepository` implementa tanto `OutboxEventRepository` quanto `OutboxEventWriter` para manter a escrita do outbox no adapter JPA sem adiantar a mensageria da task_05.
- As entities de domínio receberam annotations JPA diretamente para manter os adapters simples e compatíveis com Spring Data no estágio atual do serviço.

## Learnings
- O módulo `arrecadacao-tests` já depende de `spring-boot-starter-test` e Testcontainers PostgreSQL, então é o ponto natural para os testes de integração desta task.
- A dependência extra `flyway-database-postgresql` não estava disponível no cache local e falhou por DNS ao resolver Maven Central; a task segue somente com `flyway-core`, que já está presente no ambiente.
- O Docker CLI local funciona, mas o Testcontainers não consegue validar o daemon neste ambiente e aborta antes de iniciar o PostgreSQL container.

## Files / Surfaces
- `services/arrecadacao-api/arrecadacao-domain/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-infra/src/main/java/...`
- `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/...`
- `services/arrecadacao-api/arrecadacao-tests/src/test/java/...`
- `services/arrecadacao-api/arrecadacao-domain/pom.xml`
- `services/arrecadacao-api/arrecadacao-infra/pom.xml`

## Errors / Corrections
- `sed` na raiz para `AGENTS.md` e `CLAUDE.md` falhou porque os arquivos não existem no repositório.
- O primeiro `mvn -pl arrecadacao-tests -am test` falhou na fase `arrecadacao-infra` por não resolver `org.flywaydb:flyway-database-postgresql:10.10.0`; a dependência foi removida para nova validação.
- As duas tentativas de executar a suíte com Testcontainers (`mvn -pl arrecadacao-tests -am test` e com `DOCKER_HOST`/`DOCKER_API_VERSION`) falharam antes dos testes de integração por `IllegalStateException: Could not find a valid Docker environment`.

## Ready for Next Run
- Verificar/normalizar a integração Testcontainers x Docker Desktop neste ambiente e então reexecutar `mvn -pl arrecadacao-tests -am test` antes de marcar a task como concluída.
