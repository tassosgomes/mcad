# Resumo de Tarefas — F04: Identificação de Execuções

## Visão Geral

Implementação da tela centralizada de execuções pendentes com indicador de impacto, resolução manual (individual e lote), e background job de re-verificação automática no Cadastro.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | Clean Architecture, CQRS, BackgroundService |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq, padrão AAA |
| `react-architecture` | Feature modules, tabs, hooks |
| `common-restful-api` | REST, RFC 7807, resolução como ação |

## Fases de Implementação

### Fase 1 — Backend (Tasks 1-4)
Domain, Infra (queries), Application (handlers + worker), API (endpoints).

### Fase 2 — Frontend (Tasks 5-8)
Mockups, types/hooks, componentes, página + roteamento.

## Tarefas

- [x] 1.0 Backend — Domain (Execucao.Resolver) + Infra (queries de pendentes)
- [x] 2.0 Backend — Application (Queries: ListarPendentes, ListarImpacto)
- [x] 3.0 Backend — Application (Commands: ResolverPendente, ResolverLote) + Testes
- [x] 4.0 Backend — API (Endpoints, PendentesVerificadorWorker, Program.cs)
- [x] 5.0 Frontend — Mockups no Stitch
- [x] 6.0 Frontend — Types, API Client e Hooks
- [x] 7.0 Frontend — Componentes
- [x] 8.0 Frontend — PendentesPage + Roteamento

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Tela de execuções pendentes | 2.0, 4.0, 6.0, 7.0, 8.0 | ✅ Coberto |
| RF-02 — Indicador de impacto | 2.0, 6.0, 7.0 | ✅ Coberto |
| RF-03 — Resolução manual | 1.0, 3.0, 4.0, 6.0, 7.0 | ✅ Coberto |
| RF-04 — Resolução em lote | 3.0, 4.0, 6.0, 7.0 | ✅ Coberto |
| RF-05 — Re-verificação automática | 4.0 | ✅ Coberto |

## Validação de Cobertura

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 4.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0 (Execucao.Resolver, novos métodos repo) | ✅ |
| 3 | Lógica de Negócio | 1.0, 3.0 | ✅ |
| 4 | Endpoints / Interfaces | 4.0 | ✅ |
| 5 | Integrações Externas | 3.0, 4.0 (CadastroHttpClient reutilizado) | ✅ |
| 6 | Validações e Erros | 3.0 (OBRA_NAO_LIBERADA, STATUS_INVALIDO) | ✅ |
| 7 | Testes | Subtarefas em 3.0 | ✅ |
| 8 | Observabilidade | 4.0 (logging no Worker) | ✅ |
| 9 | Documentação | N/A — sem variáveis novas | ✅ |
| 10 | Segurança | 4.0 (auth policies) | ✅ |

## Análise de Paralelização

### Lanes

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Backend) | 1.0 → 2.0 → 3.0 → 4.0 | Sequencial |
| Lane B (Mockups) | 5.0 | Independente |
| Lane C (Frontend) | 6.0 → 7.0 → 8.0 | Sequencial |

### Diagrama

```
1.0 (Domain+Infra) → 2.0 (Queries) → 3.0 (Commands) → 4.0 (API+Worker)
                                                              │
5.0 (Stitch) ────────────────────────────────────────→ 7.0 → 8.0
6.0 (types/hooks) ──────────────────────────────────→ 7.0
```

**Paralelas desde o início:** 1.0, 5.0, 6.0
