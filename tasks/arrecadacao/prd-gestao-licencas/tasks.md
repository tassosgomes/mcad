# Resumo de Tarefas — F03: Gestao de Licencas (Backend + Frontend)

## Visao Geral

Implementacao completa da gestao de licencas: backend Java Spring Boot (CQRS, 7 endpoints, ciclo ATIVA/SUSPENSA/ENCERRADA) e frontend React (listagem, criacao, detalhes com historico, modais de transicao). Reutiliza fundacao CQRS e patterns do F02.

## Skills de Stack Consultadas

| Skill | Influencia |
|-------|------------|
| `java-architecture` | CQRS, Repository Pattern, domain methods, Specification |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers |
| `java-code-quality` | Naming, records, enum, guards |
| `react-architecture` | Feature modules, hooks, pages/components split |
| `react-code-quality` | TypeScript strict, CSS Modules, manual forms |
| `common-restful-api` | Paginacao, sort, RFC 7807, filtro vigente |

## Fases de Implementacao

### Fase 1 — Backend (Tasks 1.0–7.0)
Sequencial. Segue padrao identico ao F02 mas com entidades Licenca e HistoricoStatusLicenca.

### Fase 2 — Frontend (Tasks 8.0–11.0)
Sequencial. Depende do backend estar disponivel (endpoints funcionais). Pode iniciar apos task 6.0 usando mock server.

## Tarefas

- [x] 1.0 Migration: tabelas licencas e historico_status_licenca (V5+V6)
- [x] 2.0 Domain Layer: enum, entidades, interfaces + testes unitarios
- [x] 3.0 Infrastructure: repositorios JPA e Spring Data
- [x] 4.0 Commands + handlers (Criar, Suspender, Reativar, Encerrar) + testes
- [x] 5.0 Queries, DTOs e Specification (5 filtros + vigente) + testes
- [x] 6.0 API Layer: LicencaController (7 endpoints)
- [x] 7.0 Testes de integracao backend (persistence + endpoints)
- [x] 8.0 Frontend: types, API client, functions e hooks
- [x] 9.0 Frontend: componentes (StatusBadge, Table, Filters, Form, Modal, Timeline)
- [x] 10.0 Frontend: pages (Listagem, Criacao, Detalhes)
- [x] 11.0 Frontend: routing e sidebar

## Rastreabilidade US -> Tasks

| User Story | Tasks Backend | Tasks Frontend | Cobertura |
|------------|---------------|----------------|-----------|
| HU-01 Criar licenca | 1.0, 2.0, 4.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-02 Suspender | 2.0, 4.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-03 Reativar | 2.0, 4.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-04 Encerrar | 2.0, 4.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-05 Consultar | 3.0, 5.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-06 Detalhes + historico | 5.0, 6.0 | 8.0, 9.0, 10.0 | Direta |
| HU-07 Selecionar licenca (F04) | 5.0, 6.0 | N/A (F04 frontend) | Suporte |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 Criar vinculando Usuario+Rubrica | 2.0, 4.0 | ✅ |
| RF-02 Multiplas licencas simultaneas | 2.0 (sem unique constraint) | ✅ |
| RF-03 Usuario ATIVO obrigatorio | 4.0 (CriarHandler valida) | ✅ |
| RF-04 dataInicio >= hoje | 2.0 (domain guard) | ✅ |
| RF-05 dataFim > dataInicio | 2.0 (domain guard) | ✅ |
| RF-06 Status inicial ATIVA | 2.0 (factory method) | ✅ |
| RF-07 Suspender ATIVA→SUSPENSA | 2.0, 4.0 | ✅ |
| RF-08 Reativar SUSPENSA→ATIVA | 2.0, 4.0 | ✅ |
| RF-09 Encerrar SUSPENSA→ENCERRADA | 2.0, 4.0 | ✅ |
| RF-10 SUSPENSA recebe pagamentos | N/A (validacao em F04) | ✅ N/A |
| RF-11 ATIVA→ENCERRADA proibido | 2.0 (domain guard) | ✅ |
| RF-12 ENCERRADA imutavel | 2.0 (domain guard) | ✅ |
| RF-13 Historico automatico | 2.0, 4.0 | ✅ |
| RF-14 Listar com filtros | 5.0 (Specification) | ✅ |
| RF-15 Ordenacao -dataInicio | 5.0 (sort parser) | ✅ |
| RF-16 Paginacao page/size | 5.0 | ✅ |
| RF-17 Resposta com dados expandidos | 5.0 (DTOs), 6.0 | ✅ |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuracao | 1.0 (migration), 8.0 (apiClient, env var) | ✅ |
| 2 | Modelos de Dados | 1.0 (DDL), 2.0 (entities), 8.0 (TS types) | ✅ |
| 3 | Logica de Negocio | 2.0 (domain methods), 4.0 (handlers) | ✅ |
| 4 | Endpoints / Interfaces | 6.0 (7 endpoints) | ✅ |
| 5 | Integracoes Externas | N/A — sem integracoes externas | ✅ |
| 6 | Validacoes e Erros | 2.0 (guards), 5.0 (Bean Validation), 9.0 (client-side) | ✅ |
| 7 | Testes | 2.0, 4.0, 5.0 (unit), 7.0 (integration) | ✅ |
| 8 | Observabilidade | 6.0 (logging) | ✅ |
| 9 | Documentacao | N/A — API docs via OpenAPI contract existente | ✅ |
| 10 | Seguranca | 6.0 (@PreAuthorize), 11.0 (RequireRole) | ✅ |

## Analise de Paralelizacao

### Lanes de Execucao

```
Lane A (Backend — sequencial):
  1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0

Lane B (Frontend — sequencial, inicia apos 6.0 ou com mock):
  8.0 → 9.0 → 10.0 → 11.0
```

### Caminho Critico

Backend: 1.0 → 2.0 → 3.0 → 4.0 → 5.0 → 6.0 → 7.0
Frontend pode iniciar em paralelo com mock server apos api-contract.yaml estar pronto.

### Diagrama de Dependencias

```
BACKEND                          FRONTEND
1.0 Migration                    
 └→ 2.0 Domain                  
     └→ 3.0 Infra               
         └→ 4.0 Commands        
             └→ 5.0 Queries     
                 └→ 6.0 API ──────→ 8.0 Types+Client+Hooks
                     └→ 7.0 Tests    └→ 9.0 Components
                                         └→ 10.0 Pages
                                             └→ 11.0 Routing
```
