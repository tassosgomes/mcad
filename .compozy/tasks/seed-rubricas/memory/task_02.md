# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
- Entregar o scaffold Maven multi-module do serviço `services/arrecadacao-api` com 5 módulos, configs Spring Boot iniciais e arquivos de suporte, sem antecipar implementações das tasks 03-07.

## Important Decisions
- Parent POM criado como `br.com.ecad:arrecadacao-parent` com Java 21 e Spring Boot 3.3.5, suficiente para cumprir o requisito de Spring Boot 3.3+ e compatível com o cache local do Maven.
- Módulos `domain`, `application`, `infra` e `tests` receberam marker classes mínimos para garantir compilação e empacotamento sem adiantar código de domínio ou persistência.
- `arrecadacao-api` ficou com bootstrap/configuração mínima (`ArrecadacaoApplication`, `SecurityConfig`, `CorsConfig`, `RabbitMqConfig`, `GlobalExceptionHandler`) alinhada ao inventário do TechSpec, mas sem controller nesta task.

## Learnings
- A primeira tentativa de build falhou por resolução de artefatos do Maven Central; após alinhar versões com artefatos já presentes em `~/.m2`, `mvn clean compile` e `mvn clean verify -DskipTests` passaram.
- Não existem `AGENTS.md` ou `CLAUDE.md` dentro de `/home/tsgomes/mcad`; o contexto obrigatório desta execução veio dos documentos da task/PRD/TechSpec e da memória.

## Files / Surfaces
- `services/arrecadacao-api/pom.xml`
- `services/arrecadacao-api/.gitignore`
- `services/arrecadacao-api/.env.example`
- `services/arrecadacao-api/arrecadacao-domain/**`
- `services/arrecadacao-api/arrecadacao-application/**`
- `services/arrecadacao-api/arrecadacao-infra/**`
- `services/arrecadacao-api/arrecadacao-api/**`
- `services/arrecadacao-api/arrecadacao-tests/**`

## Errors / Corrections
- `mvn clean compile` inicialmente falhou com `Unknown host repo.maven.apache.org`; corrigido ao trocar para versões já cacheadas localmente (`Spring Boot 3.3.5`, `CloudEvents 3.0.0`, `Testcontainers 1.20.6`) e reexecutar os builds.
- `SecurityConfig` foi ajustado no self-review para não aplicar regras conflitantes quando `AUTH_ENABLED=false`.

## Ready for Next Run
- Tasks 03-07 já podem criar classes de domínio, CQRS, JPA/Flyway e endpoints dentro da estrutura gerada nesta task.
