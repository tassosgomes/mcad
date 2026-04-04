# Tasks — F01: Seed de Rubricas

> **PRD:** `_prd.md`
> **TechSpec:** `_techspec.md`
> **API Contract:** `api-contract.yaml`

## Task List

| # | Título | Status | Complexidade | Dependências |
|---|--------|--------|-------------|--------------|
| 01 | Scripts SQL + Docker Compose | completed | low | — |
| 02 | Maven multi-module scaffold | completed | high | — |
| 03 | Domain layer — Rubrica, OutboxEvent, interfaces | completed | medium | task_02 |
| 04 | Infra persistence — JPA, Flyway, seed | pending | medium | task_03 |
| 05 | Infra events — Outbox + RabbitMQ | pending | high | task_04 |
| 06 | Application layer — CQRS queries | pending | medium | task_03 |
| 07 | API layer — Spring Boot app + RubricaController | pending | high | task_04, task_05, task_06 |

## Dependency Graph

```
task_01 (SQL)  ──────────────────────────────────────┐
task_02 (Maven) ── task_03 (Domain) ── task_04 (JPA) ┤
                        │               task_05 (Outbox) ─── task_07 (API)
                        └── task_06 (CQRS) ──────────────┘
```

## Parallelism Notes

- Tasks 01 and 02 can run in parallel (no dependency between them)
- Tasks 04→05 and 06 can run in parallel after task_03
- Task 07 is the final integration point
