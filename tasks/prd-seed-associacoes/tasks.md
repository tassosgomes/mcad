# Resumo de Tarefas — F01: Seed de Associações

## Visão Geral

Implementação completa da feature F01 (Seed de Associações) incluindo fundação do backend (.NET 8) e frontend (React + Vite). São 12 tarefas organizadas em 2 lanes paralelas: Backend (Tasks 1-7) e Frontend (Tasks 8-12).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Clean Architecture, camadas numeradas, CQRS nativo, Repository Pattern |
| `dotnet-code-quality` | Convenções de naming, PascalCase, tratamento de erros |
| `dotnet-testing` | xUnit, padrão AAA, Testcontainers |
| `react-architecture` | Estrutura intermediária com features, path aliases, convenções de pastas |
| `frontend-design` | Design system, tokens CSS, direção estética |
| `common/restful-api` | Versionamento via path, ProblemDetails RFC 7807 |

## Fases de Implementação

### Fase 1 — Fundação (Tasks 1, 2, 8, 9)
Infraestrutura: scripts SQL, estrutura .NET, projeto React, design system. Backend e frontend em paralelo.

### Fase 2 — Implementação Core (Tasks 3, 4, 5, 10, 11)
Camadas de domínio, infra, application (.NET) e layout + UI components (React). Paralelo dentro de cada lane.

### Fase 3 — Integração e API (Tasks 6, 12)
Endpoints REST + página da feature consumindo a API.

### Fase 4 — Qualidade (Task 7)
Testes unitários e de integração.

## Tarefas

### Lane A — Backend (.NET 8)
- [x] 1.0 Scripts SQL: Database, Schema, Usuário e Grants
- [x] 2.0 Estrutura do Projeto .NET (Solution + Projetos + Referências)
- [x] 3.0 Camada Domain: Entidade Associacao e Interface do Repositório
- [x] 4.0 Camada Infra: DbContext, Migration com Seed e Repository
- [x] 5.0 Camada Application: CQRS Queries, Handlers e DTOs
- [x] 6.0 Camada API: Endpoints, Program.cs e Health Check
- [x] 7.0 Testes: Unitários e de Integração

### Lane B — Frontend (React + Vite)
- [x] 8.0 Setup do Projeto React (Vite + TypeScript + Aliases)
- [x] 9.0 Design System: DESIGN.md e Global CSS
- [x] 10.0 Layout: MainLayout, Header e Sidebar
- [x] 11.0 Shared UI Components: Table, PageHeader, Loading, ErrorState
- [x] 12.0 Feature Associações: API, Hook, Componentes, Página e Router

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Consultar associações) | 6.0, 11.0, 12.0 | Direta |
| HU-02 (Disponíveis no startup) | 1.0, 4.0 | Direta |
| HU-03 (Selecionar ao cadastrar titular) | 6.0 (API pronta para F02) | Suporte |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (7 associações no startup) | 4.0 | ✅ Coberto |
| RF-02 (nome, sigla, CNPJ) | 3.0, 4.0 | ✅ Coberto |
| RF-03 (seed idempotente) | 4.0, 7.0 | ✅ Coberto |
| RF-04 (sem CRUD via interface/API) | 6.0, 12.0 | ✅ Coberto |
| RF-05 (tela tabular) | 11.0, 12.0 | ✅ Coberto |
| RF-06 (acessível por ambos perfis) | N/A — sem auth na PoC | ✅ N/A |
| RF-07 (sem botões CRUD na tela) | 12.0 | ✅ Coberto |
| RF-08 (API lista) | 5.0, 6.0 | ✅ Coberto |
| RF-09 (API por ID) | 5.0, 6.0 | ✅ Coberto |
| RF-10 (405 para escrita) | 6.0, 7.0 | ✅ Coberto |

### Artefatos da TechSpec Backend

| Artefato | Task | Status |
|---|---|---|
| `scripts/00-create-database.sql` | 1.0 | ✅ |
| `scripts/01-setup-cadastro-schema.sql` | 1.0 | ✅ |
| `Cadastro.sln` + 5 projetos .csproj | 2.0 | ✅ |
| `.env.example` | 2.0 | ✅ |
| `Cadastro.Domain/Entities/Associacao.cs` | 3.0 | ✅ |
| `Cadastro.Domain/Interfaces/IAssociacaoRepository.cs` | 3.0 | ✅ |
| `Cadastro.Infra/Data/CadastroDbContext.cs` | 4.0 | ✅ |
| `Cadastro.Infra/Data/Configurations/AssociacaoConfiguration.cs` | 4.0 | ✅ |
| `Cadastro.Infra/Data/Seeds/AssociacaoSeed.cs` | 4.0 | ✅ |
| `Cadastro.Infra/Data/Migrations/` | 4.0 | ✅ |
| `Cadastro.Infra/Repositories/AssociacaoRepository.cs` | 4.0 | ✅ |
| `Cadastro.Application/Common/CQRS/*` | 5.0 | ✅ |
| `Cadastro.Application/Associacoes/Queries/*` | 5.0 | ✅ |
| `Cadastro.Application/Associacoes/Responses/*` | 5.0 | ✅ |
| `Cadastro.API/Program.cs` | 6.0 | ✅ |
| `Cadastro.API/Endpoints/AssociacaoEndpoints.cs` | 6.0 | ✅ |
| `Cadastro.UnitTests/` | 7.0 | ✅ |
| `Cadastro.IntegrationTests/` | 7.0 | ✅ |

### Artefatos da TechSpec Frontend

| Artefato | Task | Status |
|---|---|---|
| `frontend/package.json`, `vite.config.ts`, `tsconfig.json` | 8.0 | ✅ |
| `frontend/.env.example`, `.gitignore`, `index.html` | 8.0 | ✅ |
| `frontend/DESIGN.md` | ✅ Já existe | ✅ |
| `frontend/src/global.css` | 9.0 | ✅ |
| `frontend/src/shared/components/layout/*` | 10.0 | ✅ |
| `frontend/src/shared/components/ui/*` | 11.0 | ✅ |
| `frontend/src/shared/services/apiClient.ts` | 8.0 | ✅ |
| `frontend/src/shared/types/*` | 8.0 | ✅ |
| `frontend/src/shared/config/env.ts` | 8.0 | ✅ |
| `frontend/src/features/cadastro/associacoes/*` | 12.0 | ✅ |
| `frontend/src/app/providers/*` | 12.0 | ✅ |
| `frontend/src/app/router/*` | 12.0 | ✅ |
| `frontend/src/main.tsx`, `App.tsx` | 12.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 1.0, 2.0, 8.0 | ✅ |
| 2 | Modelos de Dados | 3.0, 4.0 | ✅ |
| 3 | Lógica de Negócio | 4.0 (seed idempotente) | ✅ |
| 4 | Endpoints / Interfaces | 6.0 | ✅ |
| 5 | Integrações Externas | N/A — sem integrações | ✅ |
| 6 | Validações e Erros | 6.0 (405, 404, ProblemDetails) | ✅ |
| 7 | Testes | 7.0 | ✅ |
| 8 | Observabilidade | 6.0 (health check, logging) | ✅ |
| 9 | Documentação | 9.0 (DESIGN.md) | ✅ |
| 10 | Segurança | N/A — PoC sem auth (Non-Goal) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|---|---|---|
| Lane A (Backend) | 1.0 → 2.0 → 3.0 → 4.0/5.0 → 6.0 → 7.0 | API .NET 8 + PostgreSQL |
| Lane B (Frontend) | 8.0 → 9.0 → 10.0/11.0 → 12.0 | SPA React + Vite |

### Caminho Crítico

```
Backend: 1.0 → 2.0 → 3.0 → 4.0 → 6.0 → 7.0
                              ↘ 5.0 ↗

Frontend: 8.0 → 9.0 → 10.0 → 12.0
                    ↘ 11.0 ↗
```

**Ponto de integração:** Task 12.0 (frontend) precisa que Task 6.0 (backend API) esteja concluída para teste end-to-end. Durante desenvolvimento, o frontend pode usar mock via Prism (`npx @stoplight/prism-cli mock api-contract.yaml`).

### Diagrama de Dependências

```
Lane A (Backend)                    Lane B (Frontend)

[1.0 Scripts SQL]                   [8.0 Setup React]
       ↓                                  ↓
[2.0 Estrutura .NET]                [9.0 Design System]
       ↓                                  ↓
[3.0 Domain Layer]              [10.0 Layout] ║ [11.0 UI Components]
       ↓                                  ↓         ↓
[4.0 Infra] ║ [5.0 Application]    [12.0 Feature Associações]
       ↓         ↓
[6.0 API Endpoints] ·············→ (integração e2e)
       ↓
[7.0 Testes]
```
