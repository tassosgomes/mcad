# Resumo de Tarefas de Implementacao — F07: Demonstrativo de Creditos

## Visao Geral

F07 e uma feature de consulta pura que expoe os creditos ja persistidos por F03/F04/F05 em formato de demonstrativo por titular. Nenhuma escrita nova, nenhuma migracao Flyway. A implementacao acrescenta 2 endpoints, 2 query handlers, 1 projecao JPQL, 5 metodos no CreditoRepository, DTOs de resposta, 1 controller e uma aba "Demonstrativos" no frontend.

## Fases de Implementacao

### Fase 1 — Backend Core (Tasks 1-2)
Projecao + repositorio + DTOs: base sem dependencias que habilita todos os handlers.

### Fase 2 — Application Layer (Tasks 3-4, paralelas entre si)
Query handlers de listagem e demonstrativo individual, ambos dependem da Fase 1.

### Fase 3 — API Layer (Task 5)
Controller + authz, depende da Fase 2.

### Fase 4 — Frontend (Tasks 6-7, sequenciais entre si)
Tipos + API client + hooks (Task 6) podem comecar em paralelo com a Fase 1. Componentes (Task 7) dependem de Task 6.

### Fase 5 — Testes (Tasks 8-9)
Testes unitarios (Task 8) acompanham as Tasks 3-4. Testes de integracao (Task 9) dependem da Task 5.

## Tarefas

- [x] 1.0 TitularDemonstrativoProjection + metodos CreditoRepository (domain + infra)
- [x] 2.0 DTOs de resposta (distribuicao-application)
- [x] 3.0 ListarTitularesDemonstrativoQueryHandler
- [x] 4.0 ConsultarDemonstrativoTitularQueryHandler
- [x] 5.0 DemonstrativoController + Authz
- [x] 6.0 Frontend — tipos TypeScript + API client + hooks TanStack Query
- [ ] 7.0 Frontend — componentes React + integracao em ProcessoDetailPage
- [ ] 8.0 Testes unitarios dos handlers e repositorio
- [ ] 9.0 Testes de integracao (DemonstrativoControllerIntegrationTest)

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane Backend | 1.0 → 2.0 → (3.0 ‖ 4.0) → 5.0 | Caminho critico do backend |
| Lane Frontend | 6.0 → 7.0 | Pode comecar apos contratos definidos (Task 2 pronta) |
| Lane Testes | 8.0 (junto com 3/4) + 9.0 (apos 5) | Testes unitarios surgem com os handlers; IT apos controller |

### Caminho Critico

`1.0 → 2.0 → 3.0/4.0 → 5.0 → 9.0`

### Diagrama de Dependencias

```
1.0 (Projection + Repo)
  └─> 2.0 (DTOs)
        ├─> 3.0 (Handler listagem) ─────> 5.0 (Controller + Authz) ─> 9.0 (IT)
        └─> 4.0 (Handler individual) ─/        │
                                               └─> 7.0 (FE componentes)
2.0 ──────────────────────────────> 6.0 (FE tipos + hooks) ─> 7.0

8.0 (testes unitarios) escritos junto com 3.0 e 4.0
```
