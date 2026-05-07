---
status: completed
parallelizable: false
blocked_by: []
---

<task_context>
<domain>distribuicao/infra</domain>
<type>configuration</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>none</dependencies>
<unblocks>"2.0, 5.0"</unblocks>
</task_context>

# Tarefa 1.0: Scaffolding do projeto Maven multi-módulo

## Relacionada às User Stories

- Nenhuma diretamente — tarefa de infraestrutura que habilita todas as demais

## Visão Geral

Criar a estrutura completa do projeto `distribuicao-api` como Maven multi-módulo, seguindo o padrão exato da `arrecadacao-api`. Inclui parent POM, 5 módulos (domain, application, infra, api, tests), classe main do Spring Boot e `application.yml` base.

## Requisitos

- Parent POM com Java 21, Spring Boot 3.3.5, CloudEvents 3.0.0
- 5 módulos Maven com dependências corretas entre si
- Classe `DistribuicaoApiApplication.java` funcional
- `application.yml` com datasource, JPA, Flyway, RabbitMQ e Security configurados
- Projeto compila com `mvn compile` sem erros

## Arquivos Envolvidos

- **Criar:**
  - `services/distribuicao-api/pom.xml`
  - `services/distribuicao-api/distribuicao-domain/pom.xml`
  - `services/distribuicao-api/distribuicao-application/pom.xml`
  - `services/distribuicao-api/distribuicao-infra/pom.xml`
  - `services/distribuicao-api/distribuicao-api/pom.xml`
  - `services/distribuicao-api/distribuicao-tests/pom.xml`
  - `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/DistribuicaoApiApplication.java`
  - `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml`
- **Referência:**
  - `services/arrecadacao-api/pom.xml` (estrutura Maven e versões)
  - `services/arrecadacao-api/arrecadacao-api/pom.xml` (dependências do módulo api)
  - `services/arrecadacao-api/arrecadacao-api/src/main/resources/application.yml` (configuração base)
- **Skills para consultar durante implementação:**
  - `java-architecture` — estrutura multi-módulo Maven
  - `java-dependency-config` — versões de dependências aprovadas

## Subtarefas

- [ ] 1.1 Criar parent POM com groupId `br.com.ecad`, artifactId `distribuicao-parent`, módulos declarados, dependencyManagement (Spring Boot 3.3.5, CloudEvents 3.0.0)
- [ ] 1.2 Criar POM de cada módulo com dependências inter-módulos corretas (domain ← application ← infra, api depende de todos)
- [ ] 1.3 Criar `DistribuicaoApiApplication.java` com `@SpringBootApplication`
- [ ] 1.4 Criar `application.yml` com configuração de datasource (schema distribuicao), JPA, Flyway, RabbitMQ e OAuth2 Resource Server
- [ ] 1.5 Criar estrutura de diretórios `src/main/java` e `src/main/resources` em todos os módulos
- [ ] 1.6 Verificar que `mvn compile` passa sem erros

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 2.0, 5.0
- Paralelizável: Não (é a primeira tarefa)

## Rastreabilidade

- Esta tarefa cobre: infraestrutura base
- Evidência esperada: `mvn compile` executa com sucesso

## Detalhes de Implementação

**Parent POM — dependências principais:**
```xml
<properties>
    <java.version>21</java.version>
    <spring-boot.version>3.3.5</spring-boot.version>
    <cloudevents.version>3.0.0</cloudevents.version>
</properties>
```

**Módulos e dependências:**
- `distribuicao-domain`: jakarta.persistence, spring-boot-starter-data-jpa
- `distribuicao-application`: distribuicao-domain, spring-boot-starter-validation
- `distribuicao-infra`: distribuicao-domain, spring-boot-starter-data-jpa, spring-boot-starter-amqp, cloudevents-json-jackson, flyway-core, flyway-database-postgresql
- `distribuicao-api`: distribuicao-application, distribuicao-infra, spring-boot-starter-web, spring-boot-starter-oauth2-resource-server, spring-boot-starter-actuator
- `distribuicao-tests`: distribuicao-api (scope test), spring-boot-starter-test, testcontainers

**application.yml — configuração base:**
```yaml
server:
  port: ${SERVER_PORT:5004}

spring:
  application:
    name: distribuicao-api
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mcad}
    username: ${DB_USER_DISTRIBUICAO:distribuicao_app}
    password: ${DB_PASSWORD_DISTRIBUICAO:distribuicao_app}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_schema: distribuicao
  flyway:
    enabled: true
    schemas: distribuicao
    default-schema: distribuicao
    locations: classpath:db/migration
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
    username: ${RABBITMQ_USER:mcad}
    password: ${RABBITMQ_PASSWORD:mcad}
    virtual-host: ${RABBITMQ_VHOST:mcad}
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${OIDC_ISSUER_URI:http://localhost:8080/realms/mcad}

app:
  rabbitmq:
    queues:
      rubricas: distribuicao.rubricas
  auth:
    enabled: ${AUTH_ENABLED:false}

management:
  endpoints:
    web:
      exposure:
        include: health,info
```

**Convenções da stack:**
- Seguir exatamente a estrutura de `arrecadacao-api` para consistência
- Java 21 com records habilitados
- `@SpringBootApplication(scanBasePackages = "br.com.ecad.distribuicao")`

## Critérios de Sucesso (Verificáveis)

- [ ] Build compila: `cd services/distribuicao-api && mvn compile`
- [ ] Todos os 5 módulos listados no parent POM
- [ ] `application.yml` contém: server.port=5004, schema=distribuicao, rabbitmq config, oauth2 config
- [ ] Classe main `DistribuicaoApiApplication` existe e compila
