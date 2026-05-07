# Resumo de Tarefas — F02: Gestão de Titulares

## Visão Geral

Implementação completa do CRUD de Titulares — primeira feature com escrita no sistema. São 15 tarefas organizadas em 3 lanes paralelas: Backend (Tasks 1-8), Frontend Design (Task 9) e Frontend Dev (Tasks 10-15).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Clean Architecture, CQRS Commands, Value Objects, Repository Pattern |
| `dotnet-code-quality` | FluentValidation, convenções, error handling |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `react-architecture` | Estrutura de feature, path aliases, convenções |
| `frontend-design` | Design system Circuit Core Dark, componentes |
| `common/restful-api` | Paginação, filtros, ProblemDetails |

## Fases de Implementação

### Fase 1 — Fundação (Tasks 1-2, 9-11)
Value Objects, entidade Domain, Stitch mockups, shared components fundacionais. Backend e frontend em paralelo.

### Fase 2 — Core (Tasks 3-6, 12-13)
Infra, Application (queries + commands), shared UI interação, feature hooks/API.

### Fase 3 — Integração (Tasks 7-8, 14-15)
Endpoints API, testes backend, componentes de feature, páginas e rotas.

## Tarefas

### Lane A — Backend (.NET 8)
- [x] 1.0 Value Objects: Cpf, Cnpj, CaeIpi (records) + DomainException
- [x] 2.0 Domain: Entidade Titular, Enums, ITitularRepository
- [x] 3.0 Infra: TitularConfiguration, Migration e TitularRepository
- [x] 4.0 Application: Dispatcher SendAsync + Exceptions (Conflict, Validation)
- [x] 5.0 Application: Queries (Listar paginado + GetById) + Responses
- [x] 6.0 Application: Commands (Criar, Atualizar, Excluir) + Validators
- [x] 7.0 API: TitularEndpoints + Program.cs + GlobalExceptionHandler
- [x] 8.0 Testes Backend: Unitários (Handlers) + Integração (14/14 passando) ✅

### Lane B — Frontend Design
- [x] 9.0 Stitch: 4 Mockups no projeto mcad (Listagem, Criar, Editar, Modal Excluir)

### Lane C — Frontend Dev (React)
- [x] 10.0 Shared: apiClient (POST/PUT/DELETE) + useDebounce
- [x] 11.0 Shared UI Fundação: Button, TextInput, Select, FormField, Badge
- [x] 12.0 Shared UI Interação: Pagination, Modal, Toast
- [x] 13.0 Feature: Types + API + Hooks + Utils (CPF/CNPJ)
- [x] 14.0 Feature: Componentes (Table, Filters, Form, DeleteModal)
- [x] 15.0 Feature: Páginas + Rotas + Sidebar + ToastProvider

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Cadastrar PF) | 1.0, 2.0, 6.0, 7.0, 13.0, 14.0, 15.0 | Direta |
| HU-02 (Cadastrar PJ) | 1.0, 2.0, 6.0, 7.0, 13.0, 14.0, 15.0 | Direta |
| HU-03 (Buscar na listagem) | 3.0, 5.0, 7.0, 13.0, 14.0, 15.0 | Direta |
| HU-04 (Editar titular) | 2.0, 6.0, 7.0, 13.0, 14.0, 15.0 | Direta |
| HU-05 (Visualizar detalhes) | 5.0, 7.0, 13.0, 15.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (criar titular) | 2.0, 6.0, 7.0 | ✅ |
| RF-02 (CPF válido) | 1.0, 6.0, 13.0 | ✅ |
| RF-03 (CNPJ alfanumérico) | 1.0, 6.0, 13.0 | ✅ |
| RF-04 (Value Objects) | 1.0 | ✅ |
| RF-05 (unicidade documento) | 3.0, 6.0 | ✅ |
| RF-06 (dropdown associação) | 14.0 | ✅ |
| RF-07 (nacionalidade obrigatória) | 6.0, 14.0 | ✅ |
| RF-08 (status default ATIVO) | 2.0 | ✅ |
| RF-09 (CAE/IPI opcional) | 1.0, 2.0 | ✅ |
| RF-10 (editar dados editáveis) | 2.0, 6.0, 7.0, 14.0 | ✅ |
| RF-11 (tipo/documento imutável) | 7.0, 14.0 | ✅ |
| RF-12 (status editável) | 6.0 | ✅ |
| RF-13 (paginação server-side) | 3.0, 5.0, 7.0 | ✅ |
| RF-14 (ordenação server-side) | 3.0, 5.0 | ✅ |
| RF-15 (filtro nome parcial) | 3.0, 5.0, 14.0 | ✅ |
| RF-16 (filtro documento) | 3.0, 5.0, 14.0 | ✅ |
| RF-17 (filtro associação) | 3.0, 5.0, 14.0 | ✅ |
| RF-18 (filtro status) | 3.0, 5.0, 14.0 | ✅ |
| RF-19 (colunas da tabela) | 14.0 | ✅ |
| RF-20 (ordenação clicável) | 14.0 | ✅ |
| RF-21 (API get by ID) | 5.0, 7.0 | ✅ |
| RF-22 (404 se não existir) | 5.0, 7.0 | ✅ |
| RF-23 (proteger exclusão) | 3.0, 6.0, 7.0, 14.0 | ✅ |
| RF-24 (exclusão se sem vínculos) | 6.0, 7.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 4.0 (Dispatcher ext), 10.0 (apiClient ext) | ✅ |
| 2 | Modelos de Dados | 1.0, 2.0, 3.0 | ✅ |
| 3 | Lógica de Negócio | 5.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | 7.0 | ✅ |
| 5 | Integrações Externas | N/A — sem integrações | ✅ |
| 6 | Validações e Erros | 1.0 (VOs), 6.0 (validators), 7.0 (exception handler) | ✅ |
| 7 | Testes | 8.0 | ✅ |
| 8 | Observabilidade | 7.0 (logging em endpoints) | ✅ |
| 9 | Documentação | 9.0 (Stitch mockups) | ✅ |
| 10 | Segurança | N/A — auth retroativa (docs/architecture/auth-plan.md) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|---|---|---|
| Lane A (Backend) | 1→2→3→4/5/6→7→8 | API .NET 8 CRUD |
| Lane B (Design) | 9 | Stitch mockups (independente) |
| Lane C (Frontend) | 10→11→12→13→14→15 | SPA React CRUD |

### Caminho Crítico

```
Backend: 1.0 → 2.0 → 3.0 → 6.0 → 7.0 → 8.0
                         ↘ 4.0 ↗
                         ↘ 5.0 ↗

Frontend: 9.0 (design)
          10.0 → 11.0 → 12.0 → 13.0 → 14.0 → 15.0
```

### Diagrama de Dependências

```
Lane A (Backend)                Lane B        Lane C (Frontend)

[1.0 Value Objects]             [9.0 Stitch]  [10.0 apiClient+debounce]
       ↓                                             ↓
[2.0 Domain Titular]                          [11.0 UI Fundação]
       ↓                                             ↓
[3.0 Infra]                                   [12.0 UI Interação]
       ↓                                             ↓
[4.0 Dispatcher] ║ [5.0 Queries] ║ [6.0 Cmds] [13.0 Feature hooks]
       ↓              ↓               ↓              ↓
[7.0 API Endpoints] ·······→ (integração) ← [14.0 Feature components]
       ↓                                             ↓
[8.0 Testes]                                  [15.0 Pages+Routes]
```
