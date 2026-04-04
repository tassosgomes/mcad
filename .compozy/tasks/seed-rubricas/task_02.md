---
status: pending
domain: Infrastructure
type: Configuration
scope: Full
complexity: high
dependencies: []
---

# Task 02: Maven multi-module scaffold

## Overview

Criar a estrutura completa do projeto Maven multi-module para o serviço `arrecadacao-api` — o primeiro serviço Java Spring Boot do projeto. Inclui parent POM, 5 módulos (api, application, domain, infra, tests), configurações Spring Boot (application.yml, security, CORS), e arquivos de suporte (.gitignore, .env.example). Esta fundação define os padrões para todos os serviços Java futuros.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC sections "Arquitetura do Sistema" and "Inventário de Artefatos" for exact file paths
- REFERENCE TECHSPEC section "Configuração de Ambiente" for application.yml content
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST use Maven multi-module com parent POM em `services/arrecadacao-api/pom.xml`
- MUST criar 5 módulos: arrecadacao-api, arrecadacao-application, arrecadacao-domain, arrecadacao-infra, arrecadacao-tests
- MUST usar Spring Boot 3.3+ / Java 21
- MUST respeitar dependency direction: api → application → domain ← infra; tests → all
- MUST incluir dependências: Spring Boot Starter Web, Spring Data JPA, Flyway, Spring AMQP, Spring Security OAuth2 Resource Server, CloudEvents Jackson, Actuator
- MUST configurar pacote base `br.com.ecad.arrecadacao`
- MUST criar application.yml conforme TechSpec (porta 5003, schema arrecadacao, Flyway, RabbitMQ, JWT)
- MUST criar .gitignore para Java/Maven e .env.example
</requirements>

## Subtasks

- [ ] 2.1 Criar parent POM multi-module com gestão de dependências e versões
- [ ] 2.2 Criar módulo `arrecadacao-domain` (zero dependências externas, apenas Java SE)
- [ ] 2.3 Criar módulo `arrecadacao-application` (depende de domain)
- [ ] 2.4 Criar módulo `arrecadacao-infra` (depende de domain; Spring Data JPA, Flyway, Spring AMQP, CloudEvents)
- [ ] 2.5 Criar módulo `arrecadacao-api` (depende de application + infra; Spring Boot starter, Security, Actuator)
- [ ] 2.6 Criar módulo `arrecadacao-tests` (depende de todos; JUnit 5, Mockito, AssertJ, Testcontainers)
- [ ] 2.7 Criar `application.yml`, `application-dev.yml`, `.gitignore`, `.env.example`

## Implementation Details

Referência principal: TechSpec seções "Arquitetura do Sistema", "Configuração de Ambiente" e "Inventário de Artefatos".

Pacote base: `br.com.ecad.arrecadacao`

Estrutura de diretórios:
```
services/arrecadacao-api/
├── pom.xml (parent)
├── .gitignore
├── .env.example
├── arrecadacao-api/pom.xml + src/main/java/br/com/ecad/arrecadacao/api/
├── arrecadacao-application/pom.xml + src/main/java/br/com/ecad/arrecadacao/application/
├── arrecadacao-domain/pom.xml + src/main/java/br/com/ecad/arrecadacao/domain/
├── arrecadacao-infra/pom.xml + src/main/java/br/com/ecad/arrecadacao/infra/
└── arrecadacao-tests/pom.xml + src/test/java/br/com/ecad/arrecadacao/
```

### Relevant Files
- `services/cadastro-api/Cadastro.sln` — referência de estrutura multi-projeto .NET equivalente
- `services/cadastro-api/1-Services/Cadastro.API/Program.cs` — referência de DI e middleware
- `services/cadastro-api/1-Services/Cadastro.API/appsettings.json` — referência de configuração

### Dependent Files
- Todos os módulos dependem deste scaffold para existirem
- Tasks 03-07 criam arquivos dentro desta estrutura

## Deliverables

- Parent POM + 5 module POMs compilando com `mvn clean compile`
- `ArrecadacaoApplication.java` com `@SpringBootApplication` (classe main vazia por enquanto)
- `application.yml` configurado (porta 5003, datasource, Flyway, RabbitMQ, JWT, Actuator)
- `.gitignore` e `.env.example`
- Build passing: `mvn clean verify -DskipTests` sem erros

## Tests

- Build validation (sem testes de código nesta task):
  - [ ] `mvn clean compile` compila todos os 5 módulos sem erro
  - [ ] `mvn clean verify -DskipTests` passa (packaging sem erros)
  - [ ] Dependency direction correta: domain não importa Spring; application importa domain; infra importa domain + Spring
  - [ ] `ArrecadacaoApplication.java` existe e é anotada com `@SpringBootApplication`

## Success Criteria

- Projeto compila com `mvn clean compile` sem erros
- Estrutura de 5 módulos presente com dependency direction correta
- application.yml configurado conforme TechSpec
