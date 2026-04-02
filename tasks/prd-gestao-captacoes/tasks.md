# Resumo de Tarefas — F01: Gestão de Captações

## Visão Geral

Implementação completa da feature F01 do domínio Identificação (D02): criação do serviço backend .NET 8, módulo frontend React e infraestrutura de banco de dados para gestão de captações (contêiner de execuções musicais por rubrica + dia).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | Clean Architecture 4 camadas, namespaces por agregado, CQRS |
| `dotnet-dependency-config` | EF Core 9, FluentValidation, Scrutor, Npgsql |
| `dotnet-code-quality` | PascalCase, factory methods, private setters, convenções |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq, padrão AAA |
| `react-architecture` | Feature modules, TanStack Query, React Router |
| `react-code-quality` | Convenções TypeScript, hooks pattern |
| `common-restful-api` | REST resource-oriented, RFC 7807 ProblemDetails |

## Fases de Implementação

### Fase 1 — Backend (Tasks 1-5)
Criação do serviço Identificação API com Clean Architecture, CQRS, EF Core e endpoints REST. Pode ser executado integralmente antes do frontend.

### Fase 2 — Frontend (Tasks 6-9)
Mockups no Stitch, tipos TypeScript, hooks, componentes e páginas. Task 6 (mockups) pode iniciar em paralelo com a Fase 1.

## Tarefas

- [x] 1.0 Backend — Solution, Projetos e Infraestrutura CQRS
- [x] 2.0 Backend — Domain Layer (Entidades, Enums, Interfaces)
- [x] 3.0 Backend — Infrastructure (DbContext, Migrations, Seeds, Repositórios)
- [x] 4.0 Backend — Application Layer (Commands, Queries, Validators, Responses)
- [x] 5.0 Backend — API (Program.cs, Endpoints, Auth, Exception Handler)
- [x] 6.0 Frontend — Mockups no Stitch
- [x] 7.0 Frontend — Types, API Client e Hooks
- [x] 8.0 Frontend — Componentes
- [ ] 9.0 Frontend — Pages e Roteamento

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Criar Captação | 2.0, 4.0, 5.0, 8.0, 9.0 | ✅ Coberto |
| RF-02 — Listar Captações | 4.0, 5.0, 7.0, 8.0, 9.0 | ✅ Coberto |
| RF-03 — Visualizar Detalhes | 4.0, 5.0, 7.0, 9.0 | ✅ Coberto |
| RF-04 — Editar Captação ABERTA | 2.0, 4.0, 5.0, 8.0, 9.0 | ✅ Coberto |
| RF-05 — Excluir Captação ABERTA | 4.0, 5.0, 7.0, 8.0, 9.0 | ✅ Coberto |

## Validação de Cobertura

### Artefatos da TechSpec Backend

| Artefato | Task | Status |
|----------|------|--------|
| `Identificacao.sln` + 4 `.csproj` | 1.0 | ✅ |
| CQRS infra (ICommand, IQuery, IDispatcher, Dispatcher, Unit, Exceptions) | 1.0 | ✅ |
| `Captacao.cs`, `Rubrica.cs`, `StatusCaptacao.cs` | 2.0 | ✅ |
| `ICaptacaoRepository.cs`, `IRubricaRepository.cs`, `DomainException.cs` | 2.0 | ✅ |
| `IdentificacaoDbContext.cs`, Configurations, Migration, Seed | 3.0 | ✅ |
| `CaptacaoRepository.cs`, `RubricaRepository.cs` | 3.0 | ✅ |
| Commands (Criar, Atualizar, Excluir) + Handlers + Validators | 4.0 | ✅ |
| Queries (Listar, GetById, ListarRubricas) + Handlers | 4.0 | ✅ |
| Responses (CaptacaoResponse, CaptacaoDetalheResponse, RubricaResponse) | 4.0 | ✅ |
| `Program.cs`, `CaptacaoEndpoints.cs`, `RubricaEndpoints.cs` | 5.0 | ✅ |
| `GlobalExceptionHandler.cs`, `KeycloakClaimsTransformation.cs` | 5.0 | ✅ |
| `CaptacaoTests.cs`, Handler tests | 2.0, 4.0 | ✅ |

### Artefatos da TechSpec Frontend

| Artefato | Task | Status |
|----------|------|--------|
| Mockups Stitch (4 telas) | 6.0 | ✅ |
| `captacao.ts` (types) | 7.0 | ✅ |
| `apiIdentificacaoClient.ts` | 7.0 | ✅ |
| `captacoesApi.ts` | 7.0 | ✅ |
| 6 hooks (useRubricas, useCaptacoes, useCaptacao, useCreate, useUpdate, useDelete) | 7.0 | ✅ |
| `CaptacoesTable.tsx` + CSS | 8.0 | ✅ |
| `CaptacaoForm.tsx` + CSS | 8.0 | ✅ |
| `CaptacaoFilters.tsx` + CSS | 8.0 | ✅ |
| `DeleteCaptacaoModal.tsx` + CSS | 8.0 | ✅ |
| `CaptacoesPage.tsx`, `CaptacaoCreatePage.tsx`, `CaptacaoDetailPage.tsx` | 9.0 | ✅ |
| `identificacao/index.tsx`, `captacoes/index.ts` | 9.0 | ✅ |
| `routes.tsx`, `Sidebar.tsx`, `.env.example` (modificações) | 9.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 1.0, 5.0 | ✅ |
| 2 | Modelos de Dados | 2.0, 3.0 | ✅ |
| 3 | Lógica de Negócio | 2.0, 4.0 | ✅ |
| 4 | Endpoints / Interfaces | 5.0 | ✅ |
| 5 | Integrações Externas | N/A — sem integrações externas nesta feature | ✅ |
| 6 | Validações e Erros | 4.0 (validators), 5.0 (exception handler) | ✅ |
| 7 | Testes | Subtarefas em 2.0, 4.0 | ✅ |
| 8 | Observabilidade | 5.0 (health check, structured logging) | ✅ |
| 9 | Documentação | 5.0 (.env.example) | ✅ |
| 10 | Segurança | 5.0 (JWT, policies read/write) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Backend) | 1.0 → 2.0 → 3.0 → 4.0 → 5.0 | Sequencial — cada camada depende da anterior |
| Lane B (Mockups) | 6.0 | Independente — pode iniciar imediatamente |
| Lane C (Frontend) | 7.0 → 8.0 → 9.0 | Sequencial — mas 7.0 pode iniciar junto com Lane A |

### Caminho Crítico

```
1.0 → 2.0 → 3.0 → 4.0 → 5.0 → (backend pronto)
                                      ↓
6.0 (mockups) ──────────────────→ 8.0 → 9.0
7.0 (types/hooks) ──────────────→ 8.0
```

**Tempo mínimo:** 7 tarefas sequenciais no caminho crítico (1→2→3→4→5 + 8→9), com 6.0 e 7.0 em paralelo.

### Diagrama de Dependências

```
1.0 ──→ 2.0 ──→ 3.0 ──→ 4.0 ──→ 5.0
                                    │
6.0 (paralelo) ────────────────────→├──→ 8.0 ──→ 9.0
7.0 (paralelo após api-contract) ──→│
```
