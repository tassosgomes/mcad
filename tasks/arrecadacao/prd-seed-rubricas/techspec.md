# Tech Spec — F01: Seed de Rubricas

> **PRD:** `tasks/arrecadacao/prd-seed-rubricas/prd.md`
> **API Contract:** `tasks/arrecadacao/prd-seed-rubricas/api-contract.yaml`
> **Domínio:** Arrecadação (D03)
> **Feature ID:** F01
> **Data:** 2026-04-04

---

## Resumo Executivo

Esta Tech Spec cobre a implementação da primeira feature do domínio Arrecadação e, consequentemente, a **fundação do primeiro serviço Java do projeto**. Estabelece a estrutura Spring Boot 3+ / Java 21 com Clean Architecture equivalente à do serviço .NET (Cadastro), schema PostgreSQL isolado `arrecadacao`, Flyway migrations, Outbox Pattern para publicação de eventos CloudEvents via RabbitMQ, e API read-only para consulta de rubricas.

Por ser o primeiro serviço Java, esta feature é estruturalmente crítica: define os padrões que todos os serviços Java subsequentes seguirão (Distribuição em D04, se Java). A lógica de negócio é simples (seed read-only + eventos), mas a fundação arquitetural é extensa.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | Clean Architecture, Repository Pattern, CQRS type-safe, ProblemDetail RFC 7807 |
| `java-dependency-config` | Spring Boot 3+, Spring Data JPA, Flyway, MapStruct, Spring AMQP |
| `java-code-quality` | Naming conventions, records, DTOs, logging |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers PostgreSQL |
| `java-observability` | Logging estruturado JSON, Health Checks, Actuator |
| `common/restful-api` | Padrões de API REST, versionamento via path |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
services/arrecadacao-api/
├── pom.xml                                    ← Maven multi-module
├── arrecadacao-api/                           ← Spring Boot Application (porta 5003)
│   └── src/main/java/.../api/
│       ├── ArrecadacaoApplication.java
│       ├── config/                            ← Security, CORS, OpenAPI, RabbitMQ
│       └── endpoints/                         ← REST Controllers (Minimal-style)
├── arrecadacao-application/                   ← Queries CQRS, DTOs, Mappers
│   └── src/main/java/.../application/
│       ├── rubricas/queries/
│       └── common/cqrs/
├── arrecadacao-domain/                        ← Entidades, Interfaces (zero deps externas)
│   └── src/main/java/.../domain/
│       ├── entities/
│       └── interfaces/
├── arrecadacao-infra/                         ← JPA, Repositories, Flyway, Outbox, RabbitMQ
│   └── src/main/java/.../infra/
│       ├── persistence/
│       ├── events/
│       └── config/
└── arrecadacao-tests/                         ← Testes unitários e integração
    └── src/test/java/.../
```

**Pacote base:** `br.com.ecad.arrecadacao`

**Fluxo de dados (F01 — consulta):**
```
Browser → React SPA → GET /api/v1/rubricas → ArrecadacaoController
    → QueryDispatcher → ListarRubricasQueryHandler
    → RubricaRepository (read-only)
    → Spring Data JPA → PostgreSQL schema "arrecadacao"
    → RubricaResponse[] → JSON
```

**Fluxo de dados (F01 — publicação de eventos):**
```
Startup → OutboxSeedService (detecta rubricas sem evento)
    → OutboxEventWriter.addEvent() → INSERT outbox_events (mesma transação)
    → OutboxPublisherWorker (@Scheduled, 5s)
        → SELECT pendentes → CloudEvent → RabbitMQ exchange "arrecadacao.events"
        → UPDATE published_at
```

### Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| Maven multi-module (não mono-módulo) | Isola camadas como no .NET; enforces dependency direction |
| Spring Boot 3.3+ / Java 21 | LTS atual; records, sealed, pattern matching disponíveis |
| Flyway (não JPA auto-DDL) | Migrations versionadas e auditáveis; seed via SQL |
| Spring Data JPA (não JDBC Template) | Consistente com padrão `java-dependency-config`; Repository pattern nativo |
| Outbox Pattern com @Scheduled | Equivalente funcional ao BackgroundService do .NET |
| CloudEvents via `io.cloudevents:cloudevents-json-jackson` | Mesmo formato do Cadastro; interoperável |
| Exchange topic `arrecadacao.events` | Mesmo padrão do Cadastro (`cadastro.events`) |
| Schema isolado `arrecadacao` | Schema-per-Service conforme Vision Doc |
| ProblemDetail RFC 7807 | Spring Boot 3 suporta nativamente via `spring.mvc.problemdetails.enabled=true` |

---

## Design de Implementação

### Interfaces Principais

```java
// arrecadacao-domain: interfaces/RubricaRepository.java
public interface RubricaRepository {
    List<Rubrica> findAll();
    Optional<Rubrica> findBySigla(String sigla);
}
```

```java
// arrecadacao-domain: interfaces/OutboxEventWriter.java
public interface OutboxEventWriter {
    void addEvent(String eventType, String subject, Object data);
}
```

```java
// arrecadacao-application: rubricas/queries
public record ListarRubricasQuery() implements Query<List<RubricaResponse>> {}
public record BuscarRubricaPorSiglaQuery(String sigla) implements Query<RubricaResponse> {}

public record RubricaResponse(
    UUID id,
    String sigla,
    String nome,
    boolean exigeClassificacao
) {}
```

### Modelos de Dados

#### Entidade de Domínio

```java
// arrecadacao-domain: entities/Rubrica.java
public class Rubrica {
    private UUID id;
    private String sigla;
    private String nome;
    private boolean exigeClassificacao;

    protected Rubrica() {} // JPA

    public Rubrica(UUID id, String sigla, String nome, boolean exigeClassificacao) {
        this.id = id;
        this.sigla = sigla;
        this.nome = nome;
        this.exigeClassificacao = exigeClassificacao;
    }

    // getters (immutable — no setters)
}
```

```java
// arrecadacao-domain: entities/OutboxEvent.java
public class OutboxEvent {
    private UUID id;
    private String type;          // arrecadacao.rubrica.criada
    private String routingKey;    // arrecadacao.rubrica.criada
    private String subject;       // entity ID
    private String payload;       // JSON
    private Instant createdAt;
    private Instant publishedAt;  // nullable
    private int attempts;

    public static final int MAX_ATTEMPTS = 10;

    public static OutboxEvent criar(String type, String subject, String payload) { ... }
    public void marcarPublicado() { this.publishedAt = Instant.now(); }
    public void incrementarTentativa() { this.attempts++; }
    public boolean excedeuTentativas() { return attempts >= MAX_ATTEMPTS; }
}
```

#### Schema PostgreSQL

```sql
-- Schema: arrecadacao
-- Tabela: rubricas

CREATE TABLE arrecadacao.rubricas (
    id                     UUID            PRIMARY KEY,
    sigla                  VARCHAR(20)     NOT NULL,
    nome                   VARCHAR(100)    NOT NULL,
    exige_classificacao    BOOLEAN         NOT NULL DEFAULT false,
    CONSTRAINT uq_rubricas_sigla UNIQUE (sigla)
);
```

```sql
-- Schema: arrecadacao
-- Tabela: outbox_events

CREATE TABLE arrecadacao.outbox_events (
    id              UUID            PRIMARY KEY,
    type            VARCHAR(100)    NOT NULL,
    routing_key     VARCHAR(100)    NOT NULL,
    subject         VARCHAR(255)    NOT NULL,
    payload         TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMPTZ     NULL,
    attempts        INTEGER         NOT NULL DEFAULT 0
);

CREATE INDEX ix_outbox_events_pending
    ON arrecadacao.outbox_events (created_at)
    WHERE published_at IS NULL AND attempts < 10;
```

#### Dados do Seed (Flyway migration)

```sql
-- V2__seed_rubricas.sql
INSERT INTO arrecadacao.rubricas (id, sigla, nome, exige_classificacao) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'RADIO',           'Rádio AM/FM',            false),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TV_ABERTA',       'TV Aberta',              true),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'TV_FECHADA',      'TV Fechada',             true),
    ('d4e5f6a7-b8c9-0123-defa-234567890123', 'CINEMA',          'Cinema',                 true),
    ('e5f6a7b8-c9d0-1234-efab-345678901234', 'VOD',             'Streaming Vídeo (VOD)',  true),
    ('f6a7b8c9-d0e1-2345-fabc-456789012345', 'STREAMING_AUDIO', 'Streaming Áudio',        false),
    ('a7b8c9d0-e1f2-3456-abcd-567890123456', 'SHOW',            'Show',                   false)
ON CONFLICT (sigla) DO NOTHING;
```

> **Nota:** UUIDs determinísticos (hardcoded) para garantir idempotência e referência estável cross-service. `ON CONFLICT DO NOTHING` garante idempotência.

### Endpoints de API

| Método | Path | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/v1/rubricas` | Lista todas as rubricas | `200` — `RubricaResponse[]` |
| `GET` | `/api/v1/rubricas/{sigla}` | Busca rubrica por sigla | `200` — `RubricaResponse` / `404` |
| `POST/PUT/PATCH/DELETE` | `/api/v1/rubricas/**` | Bloqueado | `405 Method Not Allowed` |

### Outbox Seed Service (detecção automática)

```java
// arrecadacao-infra: events/OutboxSeedService.java
@Component
public class OutboxSeedService {

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void publishPendingRubricaEvents() {
        // 1. Buscar todas as rubricas
        // 2. Buscar outbox_events com type = 'arrecadacao.rubrica.criada'
        // 3. Para cada rubrica sem evento correspondente:
        //    outboxEventWriter.addEvent("arrecadacao.rubrica.criada", rubrica.id, rubricaPayload)
        // 4. Commit (mesma transação)
    }
}
```

---

## Scripts de Banco de Dados

### Script — Criação de Schema, Usuário e Grants

```sql
-- scripts/postgres-init/02-setup-arrecadacao-schema.sql
-- Executar conectado ao database mcad como superuser

-- 1. Criar schema isolado para o domínio Arrecadação
CREATE SCHEMA IF NOT EXISTS arrecadacao;

-- 2. Criar usuário dedicado ao serviço
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'arrecadacao_svc') THEN
        CREATE ROLE arrecadacao_svc WITH LOGIN PASSWORD 'CHANGE_ME';
    END IF;
END
$$;

-- 3. Grants — acesso restrito ao schema arrecadacao
GRANT USAGE ON SCHEMA arrecadacao TO arrecadacao_svc;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA arrecadacao TO arrecadacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA arrecadacao
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arrecadacao_svc;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA arrecadacao TO arrecadacao_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA arrecadacao
    GRANT USAGE, SELECT ON SEQUENCES TO arrecadacao_svc;

-- 4. Revogar acesso a outros schemas
REVOKE ALL ON SCHEMA public FROM arrecadacao_svc;
REVOKE ALL ON SCHEMA cadastro FROM arrecadacao_svc;
REVOKE ALL ON SCHEMA identificacao FROM arrecadacao_svc;
```

---

## Configuração de Ambiente

### application.yml

```yaml
server:
  port: 5003

spring:
  datasource:
    url: jdbc:postgresql://${ARRECADACAO_DB_HOST:localhost}:${ARRECADACAO_DB_PORT:5432}/${ARRECADACAO_DB_NAME:mcad}?currentSchema=${ARRECADACAO_DB_SCHEMA:arrecadacao}
    username: ${ARRECADACAO_DB_USER:arrecadacao_svc}
    password: ${ARRECADACAO_DB_PASSWORD:}
    hikari:
      maximum-pool-size: 10
  jpa:
    hibernate:
      ddl-auto: validate  # Flyway gerencia schema
    properties:
      hibernate:
        default_schema: arrecadacao
  flyway:
    enabled: true
    schemas: arrecadacao
    locations: classpath:db/migration
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
    username: ${RABBITMQ_USER:mcad}
    password: ${RABBITMQ_PASSWORD:mcad}
    virtual-host: ${RABBITMQ_VHOST:mcad}
  mvc:
    problemdetails:
      enabled: true

  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${OIDC_AUTHORITY:http://localhost:8080/realms/mcad}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized
```

### .env (raiz do serviço)

```env
# Database
ARRECADACAO_DB_HOST=localhost
ARRECADACAO_DB_PORT=5432
ARRECADACAO_DB_NAME=mcad
ARRECADACAO_DB_SCHEMA=arrecadacao
ARRECADACAO_DB_USER=arrecadacao_svc
ARRECADACAO_DB_PASSWORD=

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=mcad
RABBITMQ_PASSWORD=mcad
RABBITMQ_VHOST=mcad

# Auth
OIDC_AUTHORITY=http://localhost:8080/realms/mcad
```

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| **Projeto Maven** | | |
| `services/arrecadacao-api/pom.xml` | POM | Parent POM multi-module |
| `services/arrecadacao-api/.env.example` | Config | Template de variáveis de ambiente |
| `services/arrecadacao-api/.gitignore` | Config | Gitignore para Java/Maven |
| **arrecadacao-api (Spring Boot App)** | | |
| `services/arrecadacao-api/arrecadacao-api/pom.xml` | POM | Módulo API — Spring Boot starter |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/ArrecadacaoApplication.java` | Main | Classe principal Spring Boot |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/SecurityConfig.java` | Config | JWT auth, roles, CORS |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/CorsConfig.java` | Config | CORS para frontend (localhost:5173) |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/RabbitMqConfig.java` | Config | Exchange topic `arrecadacao.events` |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` | Config | ProblemDetail RFC 7807 |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/endpoints/RubricaController.java` | Controller | GET listagem + GET por sigla + 405 bloqueio |
| `services/arrecadacao-api/arrecadacao-api/src/main/resources/application.yml` | Config | Configuração Spring Boot |
| `services/arrecadacao-api/arrecadacao-api/src/main/resources/application-dev.yml` | Config | Profile dev |
| **arrecadacao-application (CQRS)** | | |
| `services/arrecadacao-api/arrecadacao-application/pom.xml` | POM | Módulo Application |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/common/cqrs/Query.java` | Interface | Interface base Query<R> |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/common/cqrs/QueryHandler.java` | Interface | Interface base QueryHandler<Q, R> |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/common/cqrs/Command.java` | Interface | Interface base Command<R> (para features futuras) |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/common/cqrs/CommandHandler.java` | Interface | Interface base CommandHandler<C, R> |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/common/cqrs/QueryDispatcher.java` | Serviço | Dispatcher para queries |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/rubricas/queries/ListarRubricasQuery.java` | Query | Record — listar todas |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/rubricas/queries/ListarRubricasQueryHandler.java` | Handler | Handler da query de listagem |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/rubricas/queries/BuscarRubricaPorSiglaQuery.java` | Query | Record — buscar por sigla |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/rubricas/queries/BuscarRubricaPorSiglaQueryHandler.java` | Handler | Handler da query por sigla |
| `services/arrecadacao-api/arrecadacao-application/src/main/java/br/com/ecad/arrecadacao/application/rubricas/responses/RubricaResponse.java` | DTO | Response record |
| **arrecadacao-domain (Entidades)** | | |
| `services/arrecadacao-api/arrecadacao-domain/pom.xml` | POM | Módulo Domain (zero deps externas) |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Rubrica.java` | Entidade | Entidade Rubrica |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/OutboxEvent.java` | Entidade | Entidade OutboxEvent |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/RubricaRepository.java` | Interface | Contrato do repositório read-only |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/OutboxEventWriter.java` | Interface | Contrato para escrita de eventos |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/interfaces/OutboxEventRepository.java` | Interface | Contrato para leitura de eventos pendentes |
| **arrecadacao-infra (JPA, Outbox, RabbitMQ)** | | |
| `services/arrecadacao-api/arrecadacao-infra/pom.xml` | POM | Módulo Infra — Spring Data JPA, Flyway, RabbitMQ |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaRubricaRepository.java` | Repository | Spring Data JPA implementation |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/JpaOutboxEventRepository.java` | Repository | Spring Data JPA para outbox |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataRubricaRepository.java` | Interface | Spring Data interface (extends JpaRepository) |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/persistence/SpringDataOutboxEventRepository.java` | Interface | Spring Data interface para outbox |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxEventWriterImpl.java` | Serviço | Implementação — insere na outbox via JPA |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxPublisherWorker.java` | Worker | @Scheduled — poll outbox e publica no RabbitMQ |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxSeedService.java` | Serviço | @EventListener(ApplicationReadyEvent) — detecta rubricas sem evento |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/RabbitMqPublisher.java` | Serviço | Publica CloudEvent no RabbitMQ |
| **Flyway Migrations** | | |
| `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V1__create_tables.sql` | Migration | Cria tabelas rubricas + outbox_events |
| `services/arrecadacao-api/arrecadacao-infra/src/main/resources/db/migration/V2__seed_rubricas.sql` | Migration | Insere 7 rubricas com UUIDs determinísticos |
| **Testes** | | |
| `services/arrecadacao-api/arrecadacao-tests/pom.xml` | POM | Módulo de testes |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/unit/rubricas/ListarRubricasQueryHandlerTest.java` | Teste | Unitário — handler de listagem |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/unit/rubricas/BuscarRubricaPorSiglaQueryHandlerTest.java` | Teste | Unitário — handler por sigla |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/unit/events/OutboxSeedServiceTest.java` | Teste | Unitário — detecção de rubricas sem evento |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/integration/RubricaEndpointsTest.java` | Teste | Integração — endpoints com Testcontainers |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/integration/OutboxPublisherTest.java` | Teste | Integração — outbox + RabbitMQ com Testcontainers |
| `services/arrecadacao-api/arrecadacao-tests/src/test/java/br/com/ecad/arrecadacao/integration/TestcontainersConfig.java` | Config | Base Testcontainers (PostgreSQL + RabbitMQ) |
| **Scripts SQL** | | |
| `scripts/postgres-init/02-setup-arrecadacao-schema.sql` | SQL | Schema, usuário, grants |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `docker-compose.dev.yml` | Adicionar comentário sobre arrecadacao-api (porta 5003, Java) |
| `scripts/postgres-init/01-create-schemas.sql` | Adicionar `CREATE SCHEMA IF NOT EXISTS arrecadacao` e grants |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `vision.md` | Restrições globais, glossário, stack |
| `domains/arrecadacao/domain.md` | Entidades, regras RN-XX, eventos |
| `tasks/arrecadacao/prd-seed-rubricas/prd.md` | Requisitos funcionais RF-01 a RF-12 |
| `tasks/arrecadacao/prd-seed-rubricas/api-contract.yaml` | Contrato de API (fonte da verdade) |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxEventWriter.cs` | Referência do Outbox Pattern em .NET |
| `services/cadastro-api/4-Infra/Cadastro.Infra/Events/OutboxPublisherWorker.cs` | Referência do Worker em .NET |
| `services/cadastro-api/1-Services/Cadastro.API/Program.cs` | Referência de DI e middleware |

---

## Pontos de Integração

### RabbitMQ — Publicação de Eventos

| Aspecto | Valor |
|---------|-------|
| Exchange | `arrecadacao.events` (topic, durable) |
| Routing Key | `arrecadacao.rubrica.criada` |
| Formato | CloudEvents 1.0 (structured mode, JSON) |
| Source | `urn:arrecadacao-api` |
| Garantia | At-least-once via Outbox Pattern |

**Payload do evento `arrecadacao.rubrica.criada`:**
```json
{
  "specversion": "1.0",
  "id": "uuid-do-evento",
  "source": "urn:arrecadacao-api",
  "type": "arrecadacao.rubrica.criada",
  "subject": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "time": "2026-04-04T10:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "sigla": "RADIO",
    "nome": "Rádio AM/FM",
    "exigeClassificacao": false
  }
}
```

### Keycloak — Autenticação JWT

| Aspecto | Valor |
|---------|-------|
| OIDC Authority | `http://localhost:8080/realms/mcad` |
| JWKS URI | Auto-descoberta via `.well-known/openid-configuration` |
| Roles esperadas | `analista-arrecadacao`, `consultor-arrecadacao` |
| Acesso GET rubricas | Ambas as roles |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|---|---|---|---|
| Schema PostgreSQL | Novo schema `arrecadacao` | Primeiro schema Java do projeto. Baixo risco. | Executar script SQL antes do primeiro run |
| RabbitMQ | Novo exchange `arrecadacao.events` | Declarado automaticamente pelo Spring AMQP. Baixo risco. | Nenhuma — auto-declaração |
| Keycloak | Novas roles | `analista-arrecadacao` e `consultor-arrecadacao` devem ser criadas no realm `mcad` | Configurar roles no Keycloak antes de testar auth |
| Identificação (D02) | Consumo futuro de eventos | Identificação deverá consumir `arrecadacao.rubrica.criada` para sincronizar cópias locais — PRD separado | Coordenar após F01 implementada |
| Features F02-F06 (Arrecadação) | Dependência estrutural | Todas as features do domínio herdam a estrutura criada aqui | Garantir que a fundação esteja sólida |
| Domínio D04 Distribuição | Referência de padrão Java | Se Distribuição for Java, seguirá a mesma estrutura | Documentar decisões como padrão Java |

---

## Abordagem de Testes

### Testes Unitários (JUnit 5 + Mockito + AssertJ)

- **ListarRubricasQueryHandler** — mock de `RubricaRepository`, verificar que retorna 7 rubricas mapeadas para `RubricaResponse`
- **BuscarRubricaPorSiglaQueryHandler** — mock do repositório; cenário encontrado (retorna DTO) e não encontrado (lança exception)
- **OutboxSeedService** — mock de repositórios; verificar que detecta rubricas sem evento e chama `OutboxEventWriter.addEvent()` corretamente
- **Entidade Rubrica** — construtor valida argumentos não-nulos
- **Entidade OutboxEvent** — factory method `criar()`, `marcarPublicado()`, `excedeuTentativas()`

### Testes de Integração (Spring Boot Test + Testcontainers)

- **GET /api/v1/rubricas** — Testcontainers PostgreSQL + Flyway; verificar 7 registros com dados corretos
- **GET /api/v1/rubricas/{sigla}** — retorno 200 com sigla válida, 404 com sigla inexistente
- **POST /api/v1/rubricas** — retorno 405 Method Not Allowed
- **Seed idempotência** — verificar que rubricas + outbox events não duplicam após restart
- **Outbox → RabbitMQ** — Testcontainers RabbitMQ; verificar 7 eventos CloudEvents publicados no exchange correto

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Scripts SQL** — schema `arrecadacao`, usuário `arrecadacao_svc`, grants
2. **Projeto Maven** — parent POM multi-module, .gitignore, .env.example
3. **arrecadacao-domain** — entidades `Rubrica` e `OutboxEvent`, interfaces de repositórios
4. **arrecadacao-infra (persistence)** — JPA entities mapping, Spring Data repositories, Flyway migrations + seed
5. **arrecadacao-infra (events)** — `OutboxEventWriterImpl`, `OutboxPublisherWorker`, `OutboxSeedService`, `RabbitMqPublisher`
6. **arrecadacao-application** — CQRS interfaces, Queries, Handlers, DTOs
7. **arrecadacao-api** — `ArrecadacaoApplication`, configs (Security, CORS, RabbitMQ, Exception Handler), `RubricaController`
8. **Testes unitários** — handlers, seed service, entidades
9. **Testes de integração** — endpoints + outbox com Testcontainers

### Dependências Técnicas

- Java 21 SDK instalado
- Maven 3.9+ instalado
- PostgreSQL acessível (via Docker Compose)
- RabbitMQ acessível (via Docker Compose)
- Keycloak acessível com roles configuradas (via Docker Compose)
- Docker (para Testcontainers nos testes)

---

## Monitoramento e Observabilidade

### Logging

- Log estruturado JSON via Logback + Spring Boot defaults
- Log de startup: confirmação de Flyway migrations executadas, quantidade de rubricas
- Log do OutboxSeedService: quantidade de eventos gerados para rubricas sem evento
- Log do OutboxPublisherWorker: cada evento publicado com sucesso e cada falha com tentativa
- Correlation ID via MDC (`X-Request-Id` header)

### Health Checks

- `GET /actuator/health` — Spring Boot Actuator
- Indicadores: PostgreSQL connectivity, RabbitMQ connectivity
- Liveness: `/actuator/health/liveness`
- Readiness: `/actuator/health/readiness`

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Alternativas Consideradas | Justificativa |
|---------|--------------------------|---------------|
| Maven multi-module | Gradle, mono-módulo | Maven é mais estabelecido no ecossistema Spring; multi-module isola camadas |
| Flyway (não Liquibase) | Liquibase, JPA auto-DDL | SQL puro, mais simples; padrão `java-dependency-config` |
| Spring Data JPA | JDBC Template, jOOQ | Repository pattern nativo; consistente com skills Java |
| @Scheduled para Outbox Worker | Quartz, virtual threads | Simples para PoC; equivalente funcional ao BackgroundService .NET |
| `io.cloudevents:cloudevents-json-jackson` | Envelope customizado | SDK oficial CloudEvents; interoperável com Cadastro (.NET) |
| UUIDs determinísticos no seed | Auto-increment, UUIDs aleatórios | Garante idempotência e referência estável (mesmo padrão do Cadastro) |
| `ON CONFLICT DO NOTHING` no seed | `IF NOT EXISTS`, check prévio | SQL declarativo, idempotente, sem race condition |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Primeiro serviço Java — padrões ainda não validados em produção no projeto | Code review rigoroso; usar skills Java como referência; manter consistência conceitual com .NET |
| CloudEvents interoperabilidade Java ↔ .NET | Usar SDK oficial em ambos; testar consumo cruzado (Identificação .NET consumindo evento da Arrecadação Java) |
| Flyway + Spring Data JPA schema isolation | Testar que JPA não tenta criar tabelas em schema errado; `spring.jpa.hibernate.ddl-auto=validate` obrigatório |
| Outbox Worker concorrência (se múltiplas instâncias) | Para PoC, single instance é suficiente; para produção, adicionar SELECT FOR UPDATE SKIP LOCKED |

### Conformidade com Padrões

- [x] Clean Architecture multi-module (skill `java-architecture`)
- [x] CQRS type-safe (skill `java-architecture`)
- [x] Repository Pattern com Spring Data JPA (skill `java-architecture`)
- [x] ProblemDetail RFC 7807 nativo (skill `java-architecture`)
- [x] Schema-per-Service (Vision Doc)
- [x] API versionada via path (skill `common/restful-api`)
- [x] Outbox Pattern + CloudEvents (consistente com Cadastro .NET)
- [x] Flyway migrations SQL (skill `java-dependency-config`)

### Mapeamento de Regras de Negócio para Implementação

| Regra | Camada | Implementação |
|-------|--------|---------------|
| RF-01 (7 rubricas no startup) | Infra (Flyway) | Migration `V2__seed_rubricas.sql` com 7 INSERT |
| RF-02 (sigla, nome, exigeClassificacao) | Domain (Entidade) | Campos na classe `Rubrica` |
| RF-03 (seed idempotente) | Infra (Flyway) | `ON CONFLICT (sigla) DO NOTHING` |
| RF-04 (sem CRUD) | API (Controller) | Apenas GET mapeado; outros verbos retornam 405 |
| RF-05 (outbox para rubricas sem evento) | Infra (OutboxSeedService) | `@EventListener(ApplicationReadyEvent)` detecta e insere |
| RF-06 (CloudEvents) | Infra (RabbitMqPublisher) | `io.cloudevents:cloudevents-json-jackson` |
| RF-07 (payload com sigla, nome, exigeClassificacao) | Infra (OutboxSeedService) | Serialização JSON do payload |
| RF-08 (idempotência de eventos) | Infra (OutboxSeedService) | Verifica existência de evento por type+subject antes de criar |
| RF-09 (at-least-once) | Infra (OutboxPublisherWorker) | Poll + retry com max 10 tentativas |
| RF-10 (GET listagem) | API + Application | Controller → Query → Handler → Repository |
| RF-11 (GET por sigla) | API + Application | Controller → Query → Handler → Repository |
| RF-12 (405 para escrita) | API (Controller) | `@RequestMapping` com 405 para métodos não-GET |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*
