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
| D04 Distribuicao | (planned) | — | — | planned |

**Frontend**: `frontend/` — React 19 + Vite + TypeScript + TanStack Query + React Router 7. Port 5173.

**Infrastructure**: PostgreSQL 16, RabbitMQ 3.13 (AMQP events via Outbox Pattern), Keycloak 24 (OIDC/JWT), MinIO (object storage).

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

### Full stack

```bash
./dev.sh start     # Start all services (logs in .tmp/logs/)
./dev.sh stop      # Stop all services
```

### Infrastructure (local)

```bash
docker compose -f docker-compose.dev.yml up -d    # PostgreSQL, RabbitMQ, Keycloak, MinIO
./scripts/provision-keycloak.sh                     # Setup realm, client, roles, users (idempotent)
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

Copy `.env.example` to `.env` and fill in credentials. Key variables: database host/credentials per service, `RABBITMQ_URL`, `OIDC_AUTHORITY`, `AUTH_ENABLED` (toggle auth on/off), `MINIO_ENDPOINT`.

## Conventions

- Domain language (entity names, field names, API paths) is in **Portuguese**. Code structure, variable names in application/infra layers follow language conventions (C# PascalCase, Java camelCase).
- API paths follow pattern: `/api/v1/{resource}` (plural, Portuguese, kebab-case).
- Auth is via Keycloak JWT. `AUTH_ENABLED=false` disables auth checks for development.
- Event names follow `cadastro.*`, `arrecadacao.*` namespace convention.
- Tasks and PRDs are tracked per domain under `tasks/{domain}/prd-{feature}/`.
