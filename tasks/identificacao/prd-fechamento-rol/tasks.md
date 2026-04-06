# Resumo de Tarefas — F05: Fechamento do Rol

## Visão Geral

Implementação do fechamento irreversível do Rol com validação de pré-requisitos condicionais por rubrica, publicação de evento `identificacao.rol.fechado` via Outbox Pattern (primeira vez no serviço), e modal de checklist no frontend.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | Clean Architecture, CQRS, Outbox Pattern |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq |
| `react-architecture` | Feature modules, modais, hooks |
| `common-restful-api` | Ações como POST, RFC 7807 |

## Fases de Implementação

### Fase 1 — Outbox Pattern (Task 1)
Infraestrutura de eventos copiada do Cadastro. Pré-requisito para F05 e F06.

### Fase 2 — Backend (Tasks 2-4)
Domain, Application (validação + fechamento), API.

### Fase 3 — Frontend (Tasks 5-7)
Mockups, types/hooks, componentes + integração.

## Tarefas

- [x] 1.0 Backend — Outbox Pattern (entidade, writer, publisher, worker, RabbitMQ)
- [x] 2.0 Backend — Domain (Captacao.Fechar) + Infra (novos métodos repo)
- [x] 3.0 Backend — Application (ValidarPreRequisitos, FecharRol) + Testes
- [x] 4.0 Backend — API (Endpoints, Program.cs)
- [x] 5.0 Frontend — Mockups no Stitch
- [x] 6.0 Frontend — Types, API Client e Hooks
- [x] 7.0 Frontend — Componentes + Integração CaptacaoDetailPage

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Validar pré-requisitos | 2.0, 3.0, 4.0, 6.0, 7.0 | ✅ Coberto |
| RF-02 — Fechar o Rol | 2.0, 3.0, 4.0, 7.0 | ✅ Coberto |
| RF-03 — Publicar evento | 1.0, 3.0, 4.0 | ✅ Coberto |
| RF-04 — Feedback visual | 5.0, 6.0, 7.0 | ✅ Coberto |

## Validação de Cobertura

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0 (RabbitMQ), 4.0 (.env) | ✅ |
| 2 | Modelos de Dados | 1.0 (OutboxEvent), 2.0 (Captacao.Fechar) | ✅ |
| 3 | Lógica de Negócio | 2.0, 3.0 | ✅ |
| 4 | Endpoints / Interfaces | 4.0 | ✅ |
| 5 | Integrações Externas | 1.0 (RabbitMQ), 3.0 (Cadastro para validação obras) | ✅ |
| 6 | Validações e Erros | 3.0 (6 códigos de erro) | ✅ |
| 7 | Testes | Subtarefas em 3.0 | ✅ |
| 8 | Observabilidade | 1.0 (logging no OutboxWorker) | ✅ |
| 9 | Documentação | 4.0 (.env.example RabbitMQ) | ✅ |
| 10 | Segurança | 4.0 (auth, propriedade RN-08) | ✅ |

## Análise de Paralelização

### Diagrama

```
1.0 (Outbox) → 2.0 (Domain) → 3.0 (App) → 4.0 (API)
                                                 │
5.0 (Stitch) ───────────────────────────→ 7.0 ──┘
6.0 (types/hooks) ─────────────────────→ 7.0
```

**Paralelas desde o início:** 1.0, 5.0, 6.0
