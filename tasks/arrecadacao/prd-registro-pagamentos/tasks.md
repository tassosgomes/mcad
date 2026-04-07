# Resumo de Tarefas — F04: Registro de Pagamentos (Backend + Frontend)

## Visao Geral

Implementacao completa do registro de pagamentos em UDAs: backend Java Spring Boot (CQRS, 6 endpoints em 2 controllers, entidades UdaValor e Pagamento, Outbox Pattern) e frontend React (2 modulos uda/ e pagamentos/, formatacao monetaria, preview em tempo real, 4 pages). Reutiliza fundacao CQRS, Repository Pattern e Outbox Pattern do F01/F02/F03.

## Skills de Stack Consultadas

| Skill | Influencia |
|-------|------------|
| `java-architecture` | CQRS, Repository Pattern, domain methods, Outbox Pattern, @ManyToOne |
| `java-testing` | JUnit 5 + AssertJ + Mockito (AAA), Testcontainers |
| `java-code-quality` | Records, factory methods, BigDecimal, null handling |
| `java-observability` | Logging estruturado SLF4J |
| `react-architecture` | Feature modules (uda/, pagamentos/), hooks, pages/components split |
| `react-code-quality` | TypeScript strict, CSS Modules, string decimal handling |

## Fases de Implementacao

### Fase 1 — Backend (Tasks 1.0–7.0)
Sequencial. Migrations, domain, infra, commands, queries, API layer e testes de integracao.

### Fase 2 — Frontend (Tasks 8.0–11.0)
Sequencial. Depende do backend estar disponivel (endpoints funcionais). Pode iniciar apos task 6.0 usando mock server.

## Tarefas

- [x] 1.0 Migrations V7 + V8: tabelas uda_valor (com seed) e pagamento (com partial unique)
- [x] 2.0 Domain Layer: enum StatusPagamento, entidades UdaValor e Pagamento, exceptions, interfaces
- [x] 3.0 Infrastructure: repositorios JPA e Spring Data (UdaValor + Pagamento)
- [x] 4.0 Commands + Handlers: AjustarUda e RegistrarPagamento (com Outbox) + testes unitarios
- [x] 5.0 Queries, DTOs, Specification e Handlers + testes unitarios
- [x] 6.0 API Layer: UdaController (3 endpoints) + PagamentoController (3 endpoints) + GlobalExceptionHandler
- [x] 7.0 Testes de integracao: persistencia + endpoints UDA + endpoints Pagamento
- [x] 8.0 Frontend: formatCurrency + types + API functions + hooks (UDA + Pagamentos)
- [x] 9.0 Frontend: componentes e page UDA (VigenteCard, HistoricoTable, AjustarModal, UdaPage)
- [x] 10.0 Frontend: componentes e pages Pagamentos (Table, Filters, Form, StatusBadge, 3 pages)
- [x] 11.0 Frontend: routing e sidebar

## Rastreabilidade US -> Tasks

| User Story | Tasks Backend | Tasks Frontend | Cobertura |
|------------|---------------|----------------|-----------|
| HU-01 Ajustar valor UDA | 1.0, 2.0, 4.0, 6.0 | 8.0, 9.0 | Direta |
| HU-02 Consultar historico UDA | 2.0, 5.0, 6.0 | 8.0, 9.0 | Direta |
| HU-03 Registrar pagamento | 1.0, 2.0, 4.0, 6.0 | 8.0, 10.0 | Direta |
| HU-04 Consultar pagamentos | 5.0, 6.0 | 8.0, 10.0 | Direta |
| HU-05 Visualizar detalhes pagamento | 5.0, 6.0 | 8.0, 10.0 | Direta |
| HU-06 Consultar UDA vigente | 2.0, 5.0, 6.0 | 8.0, 9.0 | Direta |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 Historico append-only UDA | 1.0, 2.0 | ✅ |
| RF-02 Valor vigente = maior dataVigencia <= hoje | 2.0, 3.0, 5.0 | ✅ |
| RF-03 Apenas Analista insere UDA | 6.0 | ✅ |
| RF-04 Ambos consultam historico UDA | 6.0 | ✅ |
| RF-05 Ambos consultam UDA vigente | 6.0 | ✅ |
| RF-06 Seed Flyway R$ 107,31 | 1.0 | ✅ |
| RF-07 Pagamento apenas ATIVA/SUSPENSA | 4.0 | ✅ |
| RF-08 Rejeitar ENCERRADA com 422 | 4.0, 6.0 | ✅ |
| RF-09 Calculo valorBruto automatico | 2.0, 4.0 | ✅ |
| RF-10 Snapshot valorUdaNoMomento | 2.0, 4.0 | ✅ |
| RF-11 Periodo automatico mes corrente | 2.0 | ✅ |
| RF-12 Unicidade CONFIRMADO por licenca+periodo | 1.0, 4.0 | ✅ |
| RF-13 Evento Outbox arrecadacao.pagamento.registrado | 4.0 | ✅ |
| RF-14 Listagem paginada | 5.0, 6.0 | ✅ |
| RF-15 Filtros (5 campos) | 5.0 | ✅ |
| RF-16 Detalhes com dados expandidos | 5.0, 6.0 | ✅ |
| RF-17 Ordenacao dataRegistro DESC | 5.0 | ✅ |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuracao | 1.0 (migrations), 8.0 (env var, apiClient) | ✅ |
| 2 | Modelos de Dados | 1.0 (DDL), 2.0 (entities), 8.0 (TS types) | ✅ |
| 3 | Logica de Negocio | 2.0 (domain methods), 4.0 (handlers) | ✅ |
| 4 | Endpoints / Interfaces | 6.0 (6 endpoints) | ✅ |
| 5 | Integracoes Externas | N/A — sem integracoes externas | ✅ |
| 6 | Validacoes e Erros | 2.0 (guards), 4.0 (handler validations), 6.0 (GlobalExceptionHandler) | ✅ |
| 7 | Testes | 2.0, 4.0, 5.0 (unitarios), 7.0 (integracao) | ✅ |
| 8 | Observabilidade | 6.0 (logging SLF4J nos controllers) | ✅ |
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
1.0 Migration V7+V8             
 └→ 2.0 Domain                  
     └→ 3.0 Infra               
         └→ 4.0 Commands        
             └→ 5.0 Queries     
                 └→ 6.0 API ──────→ 8.0 Types+API+Hooks
                     └→ 7.0 Tests    └→ 9.0 UDA Components+Page
                                         └→ 10.0 Pagamentos Components+Pages
                                             └→ 11.0 Routing+Sidebar
```
