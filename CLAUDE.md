# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mcad** (mini-ECAD) is a microservices reference application for collective management of musical rights (copyright). It demonstrates DDD, Schema-per-Service, Event-Driven (Outbox Pattern), and API Composition patterns across four bounded contexts. The domain language is Portuguese (Brazilian).

Documentation hierarchy: `vision.md` → `domains/*/domain.md` → `tasks/*/prd-*/prd.md` → `techspec.md` → task files.

## Architecture

Four domains, each a separate microservice with its own PostgreSQL schema:

| Domain | Service | Tech | Port | Status |
|---|---|---|---|---|
| D01 Cadastro | `services/cadastro-api` | .NET 8 Minimal API | 5001 | done |
| D02 Identificacao | `services/identificacao-api` | .NET 8 Minimal API | 5100 | in-progress |
| D03 Arrecadacao | `services/arrecadacao-api` | Java Spring Boot 3.3 | 5003 | in-progress |
| D04 Distribuicao | `services/distribuicao-api` | Java Spring Boot 3.3 | 5004 | in-progress |

**Frontend**: `frontend/` — React 19 + Vite + TypeScript + TanStack Query + React Router 7. Port 5173.

**Infrastructure (remota por padrão — nada de stateful roda no PC)**: o fluxo local é **híbrido** — só os processos de aplicação (APIs + BFF + AI + frontend) rodam no host; toda a infra com estado é remota. Veja `docs/local-development.md`.

| Dependência | Onde roda | Como o dev local acessa |
|---|---|---|
| PostgreSQL 16 (banco `mcad`, schema-per-service, usuários `*_svc`) | servidor (stack `mcad-data`) | **VPN Tailscale** direto em `vmi3283566:5432` (`MCAD_DB_MODE=direct`) ou túnel SSH `localhost:15432` (`ssh-tunnel`) |
| RabbitMQ (eventos AMQP via Outbox Pattern) | **CloudAMQP** (`kebnekaise.lmq.cloudamqp.com`, vhost próprio) — serviço externo | `RABBITMQ_URL` no `.env.local` |
| Logto (OIDC/JWT — autenticação) | cloud `9lcinu.logto.app` | `OIDC_AUTHORITY` |
| ecad-authz (autorização fina; tem Redis/Postgres próprios) | `https://mcad-authz.tasso.dev.br` | `AUTHZ_BASE_URL` |
| Auditoria API | `https://api-audit.tasso.dev.br` | `AUDITORIA_API_BASE_URL` |
| Storage/MinIO (uploads + ClamAV) | `https://storage.tasso.dev.br` / `https://minio-api.tasso.dev.br` | `STORAGE_SERVICE_URL` |
| ISWC API | `https://iswc.tasso.dev.br` | `ISWC_BASE_URL` |

Não há Mongo nem Redis para a aplicação. `docker-compose.dev.yml` existe só como **fallback opcional** (`MCAD_DB_MODE=local-compose`) para subir Postgres/RabbitMQ locais quando se quer isolamento.

### .NET service structure (Cadastro, Identificacao)

Layered Clean Architecture with numbered folders:
- `1-Services/` — API entry point (Program.cs, Minimal API endpoints)
- `2-Application/` — Commands, Queries, Handlers, DTOs, Validators (CQRS without MediatR — native dispatcher)
- `3-Domain/` — Entities, Value Objects, Enums, Domain Events, Repository interfaces
- `4-Infra/` — EF Core DbContext, Repository implementations, RabbitMQ publisher, Outbox
- `5-Tests/` — UnitTests (xUnit) and IntegrationTests (xUnit + Testcontainers)

### Java service structure (Arrecadacao)

Maven multi-module: `arrecadacao-api`, `arrecadacao-application`, `arrecadacao-domain`, `arrecadacao-infra`, `arrecadacao-tests`. Spring Boot 3.3, JUnit 5 + AssertJ + Testcontainers.

### Frontend structure

- `src/domains/` — domain-specific pages and components (cadastro, identificacao, arrecadacao)
- `src/shared/` — auth (OIDC provider, hooks, protected routes), api clients, layout components, config

### Integration patterns

- **Outbox Pattern**: Domain events are written to `outbox_events` table in the same transaction, then published to RabbitMQ by a background poller.
- **CloudEvents**: Events follow CloudEvents spec (8 event types from Cadastro).
- **Schema-per-Service**: Each service owns its PostgreSQL schema with role-based grants.

## Development Commands

### Full stack (fluxo híbrido — ver `docs/local-development.md`)

```bash
./dev.sh up                 # Sobe a stack de app local (APIs + ai + bff + frontend)
./dev.sh up cadastro-api    # Sobe um serviço isolado (demais APIs apontam p/ o dev remoto)
./dev.sh down               # Para tudo
./dev.sh status             # Status dos processos
./dev.sh logs bff           # Tail do log de um serviço (.tmp/logs/)
```

`up`/`down` rodam cada serviço como processo do host (não em container) e, quando alguma
API com banco sobe, o `dev.sh` abre automaticamente o túnel SSH do Postgres
(`localhost:15432 -> shared-postgres:5432`). `start`/`stop` são aliases de `up`/`down`.

Pré-requisitos no PC: Node 20+, .NET SDK 8, JDK 21, Maven 3.9+, e o alias SSH `mcad-server`
configurado. Instale dependências Node uma vez: `npm ci` em `frontend/`, `services/bff/`,
`services/ai-orchestrator/` e `services/identity-sync-api/`.

### Infraestrutura local opcional (fallback)

Por padrão a infra é remota (tabela acima). Só use o compose se quiser Postgres/RabbitMQ
isolados no PC:

```bash
docker compose -f docker-compose.dev.yml up -d mcad-postgres mcad-rabbitmq
MCAD_DB_MODE=local-compose ./dev.sh up app
```

### Cadastro API (.NET)

```bash
cd services/cadastro-api/1-Services/Cadastro.API
dotnet run --launch-profile http

# Tests
cd services/cadastro-api
dotnet test                                           # All tests
dotnet test 5-Tests/Cadastro.UnitTests                # Unit tests only
dotnet test 5-Tests/Cadastro.IntegrationTests         # Integration tests (needs PostgreSQL)
dotnet test --filter "FullyQualifiedName~ClassName"   # Single test class
```

### Arrecadacao API (Java/Maven)

```bash
cd services/arrecadacao-api
mvn -pl arrecadacao-api spring-boot:run -Dspring-boot.run.profiles=dev

# Tests
mvn test                                              # All tests
mvn -pl arrecadacao-tests test                        # Test module only
mvn -pl arrecadacao-tests test -Dtest="ClassName"     # Single test class
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server (port 5173)
npm run build      # TypeScript check + production build
```

### Load tests

```bash
cd services/load-test
./validate.sh      # Functional smoke test before load run
```

## Environment

Copie `.env.dev.example` para `.env.local` (não versionado) e preencha apenas os segredos necessários. O `dev.sh` carrega `.env` e depois `.env.local` (este sobrescreve). Variáveis-chave: usuários/senhas de banco por serviço (`*_DB_USER`/`*_DB_PASSWORD`), `RABBITMQ_URL` (CloudAMQP), `OIDC_AUTHORITY` (Logto), `AUTH_ENABLED` (liga/desliga auth), `AUTHZ_BASE_URL`, `STORAGE_SERVICE_URL`. Para deploy no Swarm, a referência é `.env.swarm.example`.

## Contract Gate — OBRIGATÓRIO após mudanças de API

O CI verifica drift entre os contratos gerados pelos serviços e os arquivos em `contracts/`. Se houver diferença, o build falha com `DRIFT detectado`.

**Sempre que alterar qualquer um dos itens abaixo, execute o procedimento de exportação antes de commitar:**

### O que dispara a atualização de contratos

| Serviço | Gatilhos |
|---|---|
| cadastro, identificacao (.NET) | Rotas em `1-Services/` (Program.cs, endpoint files); DTOs de request/response em `2-Application/`; novos parâmetros de path/query |
| arrecadacao, distribuicao (Java) | Anotações `@GetMapping`/`@PostMapping`/etc. em controllers; classes de request/response body; códigos HTTP de resposta |

### Procedimento

```bash
# 1. Sobe todos os serviços (requer infra local rodando)
./dev.sh start

# 2. Exporta e grava os contratos atualizados
scripts/export-contracts.sh

# 3. Para os serviços
./dev.sh stop

# 4. Inclui os contratos atualizados no commit
git add contracts/
```

O arquivo `contracts/<servico>/openapi.json` é **gerado** (não edite manualmente). Os `asyncapi.yaml` dos serviços Java são handwritten e não são tocados pelo script.

### Verificação rápida (sem escrever)

```bash
# Checa drift sem alterar arquivos — mesma verificação do CI
./dev.sh start && scripts/export-contracts.sh --check && ./dev.sh stop
```

## Conventions

- Domain language (entity names, field names, API paths) is in **Portuguese**. Code structure, variable names in application/infra layers follow language conventions (C# PascalCase, Java camelCase).
- API paths follow pattern: `/api/v1/{resource}` (plural, Portuguese, kebab-case).
- Auth is via Keycloak JWT. `AUTH_ENABLED=false` disables auth checks for development.
- Event names follow `cadastro.*`, `arrecadacao.*` namespace convention.
- Tasks and PRDs are tracked per domain under `tasks/{domain}/prd-{feature}/`.
