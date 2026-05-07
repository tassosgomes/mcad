# Tech Spec — F01: Sincronização de Rubricas (Distribuição)

> **PRD:** `tasks/distribuicao/prd-sync-rubricas/prd.md`
> **API Contract:** `tasks/distribuicao/prd-sync-rubricas/api-contract.yaml`
> **Domínio:** Distribuição (D04)
> **Data:** 2026-04-08

---

## Resumo Executivo

Esta feature implementa o lado consumidor do padrão Event-Driven ACL para rubricas: um novo serviço Java Spring Boot (`distribuicao-api`) consome eventos `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada` do RabbitMQ, persiste uma cópia local no schema `distribuicao` do PostgreSQL e expõe uma API REST read-only na porta 5004.

É a **primeira implementação de consumidor de eventos** no projeto (arrecadacao-api só publica). O serviço segue a mesma estrutura Maven multi-módulo e padrões arquiteturais da arrecadacao-api, mas introduz a infraestrutura de consumo RabbitMQ via `@RabbitListener` com desserialização CloudEvents.

No frontend, cria-se o módulo `features/distribuicao/rubricas/` seguindo o padrão existente (pages, components, hooks, api, types) com um novo API client (`apiDistribuicaoClient.ts`) e ativação da rota no sidebar.

## Skills de Referência

| Skill | Decisões Influenciadas |
|-------|------------------------|
| `java-architecture` | Estrutura multi-módulo Maven, Clean Architecture, CQRS nativo |
| `java-dependency-config` | Spring Boot 3.3, Spring AMQP, CloudEvents, Flyway, Spring Data JPA |
| `java-code-quality` | Naming conventions, records para DTOs, null handling |
| `java-testing` | JUnit 5 + AssertJ + Mockito, Testcontainers |
| `common-restful-api` | Padrão `/api/v1/`, RFC 7807, camelCase |
| `react-architecture` | Estrutura features/{domain}/{subfeature}/ |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
RabbitMQ (arrecadacao.events exchange)
    │
    │  routing key: arrecadacao.rubrica.criada / .atualizada
    ▼
┌──────────────────────────────────────────────────┐
│  distribuicao-api (Spring Boot, porta 5004)       │
│                                                    │
│  ┌─────────────┐    ┌──────────────┐              │
│  │ RabbitMQ     │───▶│ Rubrica      │              │
│  │ Listener     │    │ EventHandler │              │
│  │ (CloudEvent  │    │ (upsert by   │              │
│  │  deser.)     │    │  sigla)      │              │
│  └─────────────┘    └──────┬───────┘              │
│                             │                      │
│                    ┌────────▼────────┐             │
│                    │ PostgreSQL       │             │
│                    │ schema:          │             │
│                    │ distribuicao     │             │
│                    │ table: rubricas  │             │
│                    └────────┬────────┘             │
│                             │                      │
│                    ┌────────▼────────┐             │
│                    │ RubricaController│             │
│                    │ GET /rubricas    │             │
│                    │ GET /rubricas/   │             │
│                    │     {sigla}      │             │
│                    └─────────────────┘             │
└──────────────────────────────────────────────────┘
         │
         │ HTTP (porta 5004)
         ▼
┌─────────────────────┐
│ Frontend React       │
│ features/distribuicao│
│ /rubricas/           │
└─────────────────────┘
```

### Fluxo de Dados

1. **Arrecadação** publica `arrecadacao.rubrica.criada` no exchange `arrecadacao.events` (TopicExchange) via Outbox Pattern
2. **RabbitMQ** roteia a mensagem para a queue `distribuicao.rubricas` (bound com routing keys `arrecadacao.rubrica.criada` e `arrecadacao.rubrica.atualizada`)
3. **RubricaEventListener** (Spring `@RabbitListener`) recebe a mensagem, desserializa o envelope CloudEvents e extrai o payload
4. **RubricaEventHandler** executa upsert na tabela `distribuicao.rubricas` usando `sigla` como chave natural
5. **RubricaController** expõe endpoints GET consumidos pelo frontend

---

## Design de Implementação

### Estrutura do Projeto (Maven Multi-Módulo)

```
services/distribuicao-api/
├── pom.xml                          (parent POM)
├── distribuicao-domain/
│   ├── pom.xml
│   └── src/main/java/br/com/ecad/distribuicao/domain/
│       ├── entities/
│       │   └── Rubrica.java
│       └── interfaces/
│           └── RubricaRepository.java
├── distribuicao-application/
│   ├── pom.xml
│   └── src/main/java/br/com/ecad/distribuicao/application/
│       ├── queries/
│       │   ├── ListarRubricasQuery.java
│       │   └── BuscarRubricaPorSiglaQuery.java
│       ├── queries/handlers/
│       │   ├── ListarRubricasQueryHandler.java
│       │   └── BuscarRubricaPorSiglaQueryHandler.java
│       └── dto/
│           └── RubricaResponse.java
├── distribuicao-infra/
│   ├── pom.xml
│   └── src/main/java/br/com/ecad/distribuicao/infra/
│       ├── persistence/
│       │   ├── SpringDataRubricaRepository.java
│       │   └── JpaRubricaRepository.java
│       └── events/
│           ├── RubricaEventListener.java
│           ├── RubricaEventHandler.java
│           └── RubricaEventPayload.java
├── distribuicao-api/
│   ├── pom.xml
│   └── src/main/java/br/com/ecad/distribuicao/api/
│       ├── DistribuicaoApiApplication.java
│       ├── controllers/
│       │   └── RubricaController.java
│       └── config/
│           ├── RabbitMqConfig.java
│           ├── SecurityConfig.java
│           └── GlobalExceptionHandler.java
└── distribuicao-tests/
    ├── pom.xml
    └── src/test/java/br/com/ecad/distribuicao/tests/
        ├── unit/
        │   ├── RubricaEventHandlerTest.java
        │   └── RubricaQueryHandlerTest.java
        └── integration/
            ├── RubricaEventListenerIntegrationTest.java
            └── RubricaControllerIntegrationTest.java
```

### Interfaces Principais

```java
// --- Domain Layer ---

// RubricaRepository.java
public interface RubricaRepository {
    List<Rubrica> findAll();
    Optional<Rubrica> findBySigla(String sigla);
    Rubrica upsertBySigla(Rubrica rubrica);
}
```

```java
// --- Application Layer ---

// RubricaResponse.java (record DTO)
public record RubricaResponse(
    UUID id,
    String sigla,
    String nome,
    boolean exigeClassificacao
) {
    public static RubricaResponse from(Rubrica entity) {
        return new RubricaResponse(
            entity.getId(),
            entity.getSigla(),
            entity.getNome(),
            entity.isExigeClassificacao()
        );
    }
}
```

```java
// --- Infra Layer (Consumer) ---

// RubricaEventPayload.java (record para deserializar data do CloudEvent)
public record RubricaEventPayload(
    String sigla,
    String nome,
    boolean exigeClassificacao
) {}

// RubricaEventListener.java
@Component
public class RubricaEventListener {

    private final RubricaEventHandler handler;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${app.rabbitmq.queues.rubricas}")
    public void onMessage(Message message) {
        // 1. Desserializar envelope CloudEvents
        // 2. Extrair payload (RubricaEventPayload)
        // 3. Validar payload (sigla obrigatória)
        // 4. Delegar para handler
        // Em caso de payload inválido: log.error + acknowledge (não requeue)
    }
}

// RubricaEventHandler.java
@Service
@Transactional
public class RubricaEventHandler {

    private final RubricaRepository repository;

    public void handle(RubricaEventPayload payload) {
        // Upsert: busca por sigla, atualiza se existe, cria se não
        repository.findBySigla(payload.sigla())
            .ifPresentOrElse(
                existing -> {
                    existing.atualizar(payload.nome(), payload.exigeClassificacao());
                    // JPA dirty checking persiste automaticamente
                },
                () -> repository.upsertBySigla(
                    Rubrica.criar(payload.sigla(), payload.nome(), payload.exigeClassificacao())
                )
            );
    }
}
```

### Modelos de Dados

#### Entidade: Rubrica

```java
@Entity
@Table(name = "rubricas", schema = "distribuicao")
public class Rubrica {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 20)
    private String sigla;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(name = "exige_classificacao", nullable = false)
    private boolean exigeClassificacao;

    @Column(name = "sincronizado_em", nullable = false)
    private Instant sincronizadoEm;

    // Factory method
    public static Rubrica criar(String sigla, String nome, boolean exigeClassificacao) { ... }

    // Update method
    public void atualizar(String nome, boolean exigeClassificacao) { ... }
}
```

#### Migration: Schema + Tabela

```sql
-- V1__create_schema_and_rubricas.sql
CREATE SCHEMA IF NOT EXISTS distribuicao;

CREATE TABLE distribuicao.rubricas (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sigla                VARCHAR(20)  NOT NULL UNIQUE,
    nome                 VARCHAR(100) NOT NULL,
    exige_classificacao  BOOLEAN      NOT NULL DEFAULT FALSE,
    sincronizado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uix_rubricas_sigla ON distribuicao.rubricas (sigla);
```

### Endpoints de API

Conforme `api-contract.yaml`:

| Método | Path | Descrição | Response |
|--------|------|-----------|----------|
| `GET` | `/api/v1/rubricas` | Listar todas as rubricas sincronizadas | `200` array / `401` |
| `GET` | `/api/v1/rubricas/{sigla}` | Buscar rubrica por sigla | `200` / `401` / `404` |

Verbos de escrita (POST, PUT, PATCH, DELETE) retornam `405 Method Not Allowed`. Implementado via ausência de mapeamentos + handler explícito no `GlobalExceptionHandler`.

### Configuração RabbitMQ (Consumer)

```java
// RabbitMqConfig.java
@Configuration
public class RabbitMqConfig {

    @Value("${app.rabbitmq.queues.rubricas}")
    private String rubricasQueue;

    @Bean
    public Queue rubricasQueue() {
        return QueueBuilder.durable(rubricasQueue).build();
    }

    @Bean
    public TopicExchange arrecadacaoEventsExchange() {
        return ExchangeBuilder.topicExchange("arrecadacao.events")
            .durable(true).build();
    }

    @Bean
    public Binding bindRubricaCriada(Queue rubricasQueue, TopicExchange arrecadacaoEventsExchange) {
        return BindingBuilder.bind(rubricasQueue)
            .to(arrecadacaoEventsExchange)
            .with("arrecadacao.rubrica.criada");
    }

    @Bean
    public Binding bindRubricaAtualizada(Queue rubricasQueue, TopicExchange arrecadacaoEventsExchange) {
        return BindingBuilder.bind(rubricasQueue)
            .to(arrecadacaoEventsExchange)
            .with("arrecadacao.rubrica.atualizada");
    }
}
```

```yaml
# application.yml (trecho relevante)
server:
  port: ${SERVER_PORT:5004}

spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:mcad}
    username: ${DB_USER_DISTRIBUICAO:distribuicao_app}
    password: ${DB_PASSWORD_DISTRIBUICAO:distribuicao_app}
  jpa:
    properties:
      hibernate:
        default_schema: distribuicao
  flyway:
    schemas: distribuicao
    default-schema: distribuicao
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
    username: ${RABBITMQ_USER:mcad}
    password: ${RABBITMQ_PASSWORD:mcad}
    virtual-host: ${RABBITMQ_VHOST:mcad}

app:
  rabbitmq:
    queues:
      rubricas: distribuicao.rubricas
```

### Frontend

#### Novo API Client

```typescript
// frontend/src/shared/services/apiDistribuicaoClient.ts
// Mesmo padrão de apiArrecadacaoClient.ts
// BASE_URL: import.meta.env.VITE_DISTRIBUICAO_API_BASE_URL || 'http://localhost:5004/api/v1'
// Métodos: apiGet, apiPost, apiPut, apiPatch, apiDelete
// Auth token injection via setDistribuicaoAuthTokenProvider()
```

#### Tipos

```typescript
// frontend/src/features/distribuicao/rubricas/types/rubrica.ts
export interface Rubrica {
  id: string;
  sigla: string;
  nome: string;
  exigeClassificacao: boolean;
}
```

#### Hook de Dados

```typescript
// frontend/src/features/distribuicao/rubricas/hooks/useRubricas.ts
// TanStack Query: useQuery({ queryKey: ['distribuicao', 'rubricas'], queryFn: ... })
```

#### Página

```typescript
// frontend/src/features/distribuicao/rubricas/pages/RubricasPage.tsx
// PageHeader + Table (sigla, nome, badge Sim/Não) + EmptyState
```

#### Roteamento

```typescript
// frontend/src/features/distribuicao/index.tsx
// <Routes>
//   <Route path="rubricas" element={<RubricasPage />} />
// </Routes>
```

---

## Pontos de Integração

### RabbitMQ — Exchange `arrecadacao.events`

| Aspecto | Detalhe |
|---------|---------|
| Exchange | `arrecadacao.events` (TopicExchange, durable) — já existe, declarado pela Arrecadação |
| Queue | `distribuicao.rubricas` (durable) — declarada pela Distribuição |
| Bindings | `arrecadacao.rubrica.criada` → `distribuicao.rubricas` |
| | `arrecadacao.rubrica.atualizada` → `distribuicao.rubricas` |
| Formato | CloudEvents v1.0 (JSON), content-type `application/cloudevents+json` |
| Garantia | At-least-once (idempotência no consumidor via upsert por sigla) |
| Erro | Payload inválido → log.error + acknowledge (sem requeue, sem DLQ) |

### Keycloak — Autenticação

| Aspecto | Detalhe |
|---------|---------|
| Realm | `mcad` (existente) |
| Roles novas | `analista-distribuicao`, `consultor-distribuicao` |
| Endpoint público | Nenhum — todos exigem JWT |
| Configuração | `spring-boot-starter-oauth2-resource-server` (mesmo padrão arrecadacao-api) |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|----|----|----|---|
| `docker-compose.dev.yml` | Config nova | Adicionar serviço `distribuicao-api` (porta 5004, schema, grants) | Baixo — aditivo |
| PostgreSQL (init scripts) | Schema novo | Criar schema `distribuicao` + role `distribuicao_app` com grants | Baixo — aditivo |
| RabbitMQ | Queue nova | Queue `distribuicao.rubricas` + bindings ao exchange existente | Baixo — aditivo, não impacta arrecadação |
| Keycloak (`provision-keycloak.sh`) | Roles novas | Adicionar `analista-distribuicao` e `consultor-distribuicao` | Baixo — aditivo |
| Frontend sidebar | Ativação | Remover `disabled: true` do item "Distribuição" | Baixo |
| Frontend `AuthProvider.tsx` | Config | Integrar `setDistribuicaoAuthTokenProvider()` | Baixo |
| Frontend `routes.tsx` | Rota nova | Lazy-load do módulo distribuicao | Baixo — aditivo |
| `dev.sh` | Script | Adicionar start/stop do distribuicao-api | Baixo — aditivo |
| `.env.example` | Config | Adicionar variáveis de ambiente do distribuicao-api | Baixo — aditivo |

**Impacto em outros domínios:** Nenhum. A Distribuição apenas consome eventos existentes — não altera nenhum componente da Arrecadação, Identificação ou Cadastro.

---

## Abordagem de Testes

### Testes Unitários

| Componente | Cenários Críticos |
|------------|-------------------|
| `RubricaEventHandler` | (1) Cria rubrica quando sigla não existe; (2) Atualiza rubrica quando sigla já existe (idempotência); (3) Múltiplos eventos iguais não duplicam |
| `ListarRubricasQueryHandler` | (1) Retorna lista com N rubricas; (2) Retorna lista vazia quando não há rubricas |
| `BuscarRubricaPorSiglaQueryHandler` | (1) Retorna rubrica existente; (2) Lança exceção para sigla inexistente |

**Mocks:** Apenas `RubricaRepository` (interface do domain).

### Testes de Integração

| Componente | Cenários Críticos |
|------------|-------------------|
| `RubricaEventListenerIntegrationTest` | (1) Mensagem CloudEvent válida → rubrica persistida no PostgreSQL; (2) Mensagem com payload inválido → descartada sem erro; (3) Redelivery → idempotente |
| `RubricaControllerIntegrationTest` | (1) GET /rubricas retorna lista; (2) GET /rubricas retorna [] quando vazio; (3) GET /rubricas/{sigla} retorna 200; (4) GET /rubricas/{sigla} retorna 404; (5) POST /rubricas retorna 405; (6) Sem JWT retorna 401 |

**Infra de testes:** Testcontainers (PostgreSQL + RabbitMQ).

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Scaffolding do projeto Maven** — parent POM, módulos, dependências base. Garante que o projeto compila.
2. **Infra: schema PostgreSQL + migration Flyway** — cria schema `distribuicao` e tabela `rubricas`.
3. **Domain: entidade Rubrica + interface do repositório** — modelo de domínio.
4. **Infra: repositório JPA** — implementação de persistência (SpringData + adapter).
5. **Infra: consumidor RabbitMQ** — `RabbitMqConfig` (queue, bindings), `RubricaEventListener` (desserialização CloudEvents), `RubricaEventHandler` (upsert).
6. **Application: queries + DTOs** — `ListarRubricasQuery`, `BuscarRubricaPorSiglaQuery`, `RubricaResponse`.
7. **API: controller + security + exception handler** — endpoints REST, JWT, 405.
8. **Infra: Docker Compose + scripts** — serviço, schema grants, Keycloak roles, `dev.sh`.
9. **Testes unitários** — handler e query handlers.
10. **Testes de integração** — listener + controller com Testcontainers.
11. **Frontend: API client + tipos** — `apiDistribuicaoClient.ts`, `rubrica.ts`.
12. **Frontend: hook + página + roteamento** — `useRubricas`, `RubricasPage`, rotas, sidebar ativado.

### Dependências Técnicas

| Dependência | Status | Bloqueante? |
|-------------|--------|-------------|
| Arrecadação publicando eventos `arrecadacao.rubrica.criada` | Implementado (OutboxSeedService) | Sim — sem eventos, não há rubricas |
| RabbitMQ rodando | Disponível via docker-compose.dev.yml | Sim |
| PostgreSQL rodando | Disponível via docker-compose.dev.yml | Sim |
| Keycloak com realm mcad | Disponível | Não — AUTH_ENABLED=false para dev |

---

## Monitoramento e Observabilidade

### Logs

| Evento | Nível | Mensagem |
|--------|-------|----------|
| Rubrica criada via evento | INFO | `Rubrica sincronizada: sigla={}, nome={}` |
| Rubrica atualizada via evento | INFO | `Rubrica atualizada: sigla={}, campos=[nome, exigeClassificacao]` |
| Payload inválido descartado | ERROR | `Evento descartado: payload inválido. type={}, reason={}` |
| Erro inesperado no listener | ERROR | `Erro ao processar evento de rubrica: {}` (com stack trace) |

### Health Check

- Spring Actuator `/actuator/health` — verifica PostgreSQL e RabbitMQ connectivity.

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa | Alternativa Rejeitada |
|---------|---------------|-----------------------|
| `@RabbitListener` nativo do Spring AMQP | Simples, bem documentado, suficiente para volume baixo (7 eventos) | Spring Cloud Stream — overhead desnecessário para PoC |
| Upsert por sigla (findBySigla + save) | Garante idempotência; sigla é chave natural estável | `INSERT ... ON CONFLICT` nativo — perde portabilidade JPA |
| Queue exclusiva `distribuicao.rubricas` | Isolamento — cada consumidor tem sua queue; não interfere em outros | Queue compartilhada — risco de competição entre consumidores |
| Desserialização manual de CloudEvents | Controle total do parsing; fallback gracioso para payloads inválidos | Desserialização automática via Spring Cloud — acoplamento desnecessário |
| `sincronizadoEm` como campo extra | Rastreabilidade de quando a cópia local foi atualizada | Nenhum — sempre útil para debug |
| Projeto Maven separado (não submódulo da arrecadação) | Cada bounded context é um serviço independente (Schema-per-Service) | Módulo dentro da arrecadação — viola isolamento |

### Riscos Conhecidos

| Risco | Mitigação |
|-------|-----------|
| Distribuição sobe antes da Arrecadação publicar eventos → tabela vazia | Aceitável: frontend exibe estado vazio; F02 valida existência de rubrica |
| Mensagem perdida no RabbitMQ (ex: queue não existe no momento do publish) | Queue declarada como durable; binding criado no startup da Distribuição; Arrecadação republica no restart (OutboxSeedService) |
| Formato do CloudEvent muda na Arrecadação sem aviso | Testes de integração com schema fixo; validação de payload no listener |

### Conformidade com Padrões

- [x] Maven multi-módulo (mesmo padrão arrecadacao-api)
- [x] Clean Architecture: domain → application → infra → api
- [x] CQRS: queries + handlers separados
- [x] Records para DTOs (Java 21)
- [x] RFC 7807 ProblemDetails para erros
- [x] CloudEvents para formato de eventos
- [x] Schema-per-Service (schema `distribuicao` isolado)
- [x] Flyway para migrations
- [x] JWT/OAuth2 via Keycloak
- [x] Testcontainers para testes de integração

---

## Inventário de Artefatos

### Arquivos a Criar

#### Backend — Projeto Maven

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/pom.xml` | Config | Parent POM com módulos e dependências |
| `services/distribuicao-api/distribuicao-domain/pom.xml` | Config | POM do módulo domain |
| `services/distribuicao-api/distribuicao-application/pom.xml` | Config | POM do módulo application |
| `services/distribuicao-api/distribuicao-infra/pom.xml` | Config | POM do módulo infra |
| `services/distribuicao-api/distribuicao-api/pom.xml` | Config | POM do módulo api |
| `services/distribuicao-api/distribuicao-tests/pom.xml` | Config | POM do módulo tests |

#### Backend — Domain

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/entities/Rubrica.java` | Entidade | Entidade JPA com factory method e update |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/interfaces/RubricaRepository.java` | Interface | Contrato do repositório (findAll, findBySigla, upsertBySigla) |
| `services/distribuicao-api/distribuicao-domain/src/main/java/br/com/ecad/distribuicao/domain/exceptions/NotFoundException.java` | Exceção | Exceção de domínio para recurso não encontrado |

#### Backend — Application

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/dto/RubricaResponse.java` | DTO | Record de resposta com factory method `from(Rubrica)` |
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/ListarRubricasQuery.java` | Query | Query CQRS para listar rubricas |
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/BuscarRubricaPorSiglaQuery.java` | Query | Query CQRS para buscar por sigla |
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/ListarRubricasQueryHandler.java` | Handler | Implementação da query de listagem |
| `services/distribuicao-api/distribuicao-application/src/main/java/br/com/ecad/distribuicao/application/queries/handlers/BuscarRubricaPorSiglaQueryHandler.java` | Handler | Implementação da query por sigla |

#### Backend — Infra

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/SpringDataRubricaRepository.java` | Repo | JpaRepository com `findBySigla` |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/persistence/JpaRubricaRepository.java` | Repo | Adapter que implementa RubricaRepository |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventPayload.java` | DTO | Record para desserializar payload do CloudEvent |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventListener.java` | Listener | `@RabbitListener` que desserializa CloudEvent e delega ao handler |
| `services/distribuicao-api/distribuicao-infra/src/main/java/br/com/ecad/distribuicao/infra/events/RubricaEventHandler.java` | Service | Lógica de upsert por sigla (transacional) |
| `services/distribuicao-api/distribuicao-infra/src/main/resources/db/migration/V1__create_schema_and_rubricas.sql` | Migration | Schema `distribuicao` + tabela `rubricas` |

#### Backend — API

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/DistribuicaoApiApplication.java` | App | Classe main do Spring Boot |
| `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/controllers/RubricaController.java` | Controller | Endpoints GET /rubricas e GET /rubricas/{sigla} |
| `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/RabbitMqConfig.java` | Config | Queue, exchange, bindings |
| `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/SecurityConfig.java` | Config | Spring Security OAuth2 Resource Server |
| `services/distribuicao-api/distribuicao-api/src/main/java/br/com/ecad/distribuicao/api/config/GlobalExceptionHandler.java` | Config | RFC 7807 ProblemDetails + 405 handler |
| `services/distribuicao-api/distribuicao-api/src/main/resources/application.yml` | Config | Datasource, JPA, Flyway, RabbitMQ, Security |

#### Backend — Testes

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/RubricaEventHandlerTest.java` | Teste | Unitário: upsert, idempotência |
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/unit/RubricaQueryHandlerTest.java` | Teste | Unitário: listagem e busca por sigla |
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/RubricaEventListenerIntegrationTest.java` | Teste | Integração: RabbitMQ → PostgreSQL (Testcontainers) |
| `services/distribuicao-api/distribuicao-tests/src/test/java/br/com/ecad/distribuicao/tests/integration/RubricaControllerIntegrationTest.java` | Teste | Integração: API HTTP + JWT (Testcontainers) |

#### Frontend

| Caminho | Tipo | Descrição |
|---------|------|-----------|
| `frontend/src/shared/services/apiDistribuicaoClient.ts` | API Client | Client HTTP para distribuicao-api (porta 5004) |
| `frontend/src/features/distribuicao/rubricas/types/rubrica.ts` | Tipo | Interface Rubrica |
| `frontend/src/features/distribuicao/rubricas/api/rubricasApi.ts` | API | Funções de fetch (listarRubricas) |
| `frontend/src/features/distribuicao/rubricas/hooks/useRubricas.ts` | Hook | TanStack Query hook |
| `frontend/src/features/distribuicao/rubricas/components/RubricasTable.tsx` | Componente | Tabela de rubricas com badge Sim/Não |
| `frontend/src/features/distribuicao/rubricas/pages/RubricasPage.tsx` | Página | PageHeader + Table + EmptyState |
| `frontend/src/features/distribuicao/rubricas/index.ts` | Barrel | Exports públicos |
| `frontend/src/features/distribuicao/index.tsx` | Router | Rotas do módulo distribuicao |

### Arquivos a Modificar

| Caminho | Alteração |
|---------|-----------|
| `docker-compose.dev.yml` | Adicionar serviço `distribuicao-api` (porta 5004, env vars, depends_on) |
| `scripts/provision-keycloak.sh` | Adicionar roles `analista-distribuicao` e `consultor-distribuicao` |
| `dev.sh` | Adicionar start/stop do distribuicao-api |
| `.env.example` | Adicionar variáveis: `DB_USER_DISTRIBUICAO`, `DB_PASSWORD_DISTRIBUICAO`, `VITE_DISTRIBUICAO_API_BASE_URL` |
| `frontend/src/shared/auth/AuthProvider.tsx` | Importar e chamar `setDistribuicaoAuthTokenProvider()` |
| `frontend/src/app/router/routes.tsx` | Adicionar lazy-load da rota `/distribuicao/*` |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Remover `disabled: true` do item Distribuição; adicionar sub-item "Rubricas" |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---------|--------|
| `services/arrecadacao-api/pom.xml` | Referência para estrutura Maven e versões de dependências |
| `services/arrecadacao-api/arrecadacao-domain/src/main/java/br/com/ecad/arrecadacao/domain/entities/Rubrica.java` | Referência para entidade Rubrica (fonte de verdade) |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/RabbitMqPublisher.java` | Referência para formato CloudEvents publicado |
| `services/arrecadacao-api/arrecadacao-infra/src/main/java/br/com/ecad/arrecadacao/infra/events/OutboxSeedService.java` | Referência para payload de `arrecadacao.rubrica.criada` |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/RabbitMqConfig.java` | Referência para configuração do exchange |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/SecurityConfig.java` | Referência para configuração JWT/OAuth2 |
| `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/config/GlobalExceptionHandler.java` | Referência para padrão RFC 7807 |
| `services/arrecadacao-api/arrecadacao-api/src/main/resources/application.yml` | Referência para configuração Spring Boot |
| `frontend/src/shared/services/apiArrecadacaoClient.ts` | Referência para padrão de API client |
| `frontend/src/features/arrecadacao/licencas/` | Referência para estrutura de feature frontend |

---

*Tech Spec gerada com a skill `flow-techspec-creator`. Para gerar as tarefas de implementação, use a skill `flow-task-creator` fornecendo este arquivo como contexto.*
