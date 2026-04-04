# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

## Shared Decisions
- O contrato de domínio `OutboxEventRepository` usa `findPending(int limit)` e `existsByTypeAndSubject(String type, String subject)` para cobrir polling do worker e idempotência do seed sem mover escrita para fora de `OutboxEventWriter`.

## Shared Learnings
- Para negar acesso real ao schema `public` para uma role de serviço no PostgreSQL, não basta `REVOKE ... FROM <role>`; o script também precisa remover os privilégios herdados de `PUBLIC`.

## Open Risks

## Handoffs
- `scripts/postgres-init/02-setup-arrecadacao-schema.sql` usa `ARRECADACAO_DB_PASSWORD` via `psql \\getenv`, com fallback para `CHANGE_ME` quando a variável não estiver definida no processo de init.
