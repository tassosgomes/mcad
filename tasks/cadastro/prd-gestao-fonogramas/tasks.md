# Resumo de Tarefas — F05: Gestão de Fonogramas

## Visão Geral

Implementação do CRUD de Fonogramas com ISRC validado, dual view (tela própria + seção na obra), depuração e interdependência de status com obra. São 15 tarefas em 3 lanes paralelas.

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Value Object Isrc, CQRS, Repository, depuração |
| `dotnet-code-quality` | FluentValidation, ProblemDetails |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `react-architecture` | Dual view, feature structure, path aliases |
| `frontend-design` | Design system Circuit Core Dark |
| `common/restful-api` | Sub-resources, depuração, paginação |

## Fases de Implementação

### Fase 1 — Domain + Infra + Design (Tasks 1-3, 8-9)
VO Isrc, entidade, migration, repository, Stitch mockups, utils frontend.

### Fase 2 — Application + Frontend Core (Tasks 4-5, 10-12)
Queries, Commands, types/API/hooks, componentes.

### Fase 3 — Integração + Testes (Tasks 6-7, 13-15)
Endpoints, testes, páginas, rotas, seção na obra.

## Tarefas

### Lane A — Backend (.NET 8)
- [x] 1.0 Domain: Value Object Isrc, Entidade Fonograma, StatusFonograma, IFonogramaRepository
- [x] 2.0 Infra: FonogramaConfiguration, Migration, FonogramaRepository
- [x] 3.0 Infra Fix: ObraRepository.PossuiVinculosAsync + fonogramas
- [x] 4.0 Application: Queries (Listar, GetById, ListarPorObra) + Responses
- [x] 5.0 Application: Commands (Criar, Atualizar, Excluir, Depurar) + Validators
- [x] 6.0 API: FonogramaEndpoints (7 endpoints) + Program.cs
- [x] 7.0 Testes Backend: Unitários (VO + Entidade + Handlers) + Integração

### Lane B — Frontend Design
- [x] 8.0 Stitch: 6 Mockups no projeto mcad

### Lane C — Frontend Dev (React)
- [x] 9.0 Feature: Utils (isrcValidator + isrcFormatter) + Types + API + Hooks
- [x] 10.0 Feature: ObraSelect + Componentes Simples (Table, Filters, Form, DeleteModal)
- [x] 11.0 Feature: Componentes Depuração (Banner, Modal)
- [x] 12.0 Feature: ObraFonogramasSection
- [x] 13.0 Feature: Páginas (Listagem, Criar, Detalhe)
- [x] 14.0 Integração: Routes + Sidebar + ObraDetailPage

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Criar fonograma) | 1.0, 5.0, 6.0, 9.0, 10.0, 13.0 | Direta |
| HU-02 (Listar fonogramas) | 2.0, 4.0, 6.0, 9.0, 10.0, 13.0 | Direta |
| HU-03 (Fonogramas da obra) | 4.0, 6.0, 12.0, 14.0 | Direta |
| HU-04 (Editar dados) | 1.0, 5.0, 6.0, 10.0, 13.0 | Direta |
| HU-05 (Depuração ISRC) | 1.0, 5.0, 6.0, 11.0, 13.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (criar) | 1.0, 5.0, 6.0 | ✅ |
| RF-02 (ISRC formato) | 1.0, 5.0, 9.0 | ✅ |
| RF-03 (ISRC único) | 2.0, 5.0 | ✅ |
| RF-04 (obra obrigatória) | 5.0 | ✅ |
| RF-05 (PENDENTE_VALIDACAO) | 1.0 | ✅ |
| RF-06 (paginação) | 2.0, 4.0, 6.0 | ✅ |
| RF-07 (ordenação) | 2.0, 4.0 | ✅ |
| RF-08 (filtros) | 2.0, 4.0, 10.0 | ✅ |
| RF-09 (colunas) | 10.0 | ✅ |
| RF-10 (seção na obra) | 12.0, 14.0 | ✅ |
| RF-11 (botão novo) | 12.0 | ✅ |
| RF-12 (click navega) | 12.0 | ✅ |
| RF-13 (read-only DEPURADA) | 12.0 | ✅ |
| RF-14 (edição PENDENTE) | 1.0, 5.0 | ✅ |
| RF-15 (ISRC valida formato+unicidade) | 1.0, 5.0, 9.0 | ✅ |
| RF-16 (ISRC LIBERADO → depuração) | 5.0, 11.0, 13.0 | ✅ |
| RF-17 (país/datas sem depuração) | 5.0 | ✅ |
| RF-18 (depuração transacional) | 5.0, 6.0 | ✅ |
| RF-19 (DEPURADO imutável + ref) | 1.0, 11.0 | ✅ |
| RF-20 (novo sem conexos) | 5.0 | ✅ |
| RF-21 (conexos disparam depuração) | 5.0 (preparado para F06) | ✅ |
| RF-22 (endpoint depurar) | 6.0 | ✅ |
| RF-23 (não libera sem obra LIBERADA) | N/A — F07 | ✅ |
| RF-24 (obra LIBERADA sem PENDENTE) | N/A — F07 | ✅ |
| RF-25 (obra depurada → fono fica) | — (nenhuma lógica necessária) | ✅ |
| RF-26 (consulta por ID) | 4.0, 6.0 | ✅ |
| RF-27 (404) | 4.0, 6.0 | ✅ |
| RF-28 (exclusão PENDENTE) | 1.0, 5.0 | ✅ |
| RF-29 (LIBERADO/DEPURADO sem exclusão) | 5.0, 6.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 6.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0, 2.0 | ✅ |
| 3 | Lógica de Negócio | 5.0 | ✅ |
| 4 | Endpoints / Interfaces | 6.0 | ✅ |
| 5 | Integrações Externas | N/A — sem novas | ✅ |
| 6 | Validações e Erros | 1.0, 5.0 | ✅ |
| 7 | Testes | 7.0 | ✅ |
| 8 | Observabilidade | 6.0 (logging) | ✅ |
| 9 | Documentação | 8.0 (Stitch) | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

### Diagrama de Dependências

```
Lane A (Backend)                   Lane B        Lane C (Frontend)

[1.0 Domain (Isrc+Fono)]          [8.0 Stitch]  [9.0 Utils+Types+API+Hooks]
    ↓                                                    ↓
[2.0 Infra] ║ [3.0 Fix Vínculos]              [10.0 ObraSelect+Comp Simples]
    ↓              ↓                             ║ [11.0 Comp Depuração]
[4.0 Queries] ║ [5.0 Commands]                         ↓
    ↓               ↓                           [12.0 ObraFonogramasSection]
[6.0 API Endpoints] ·······→ (integração) ←    [13.0 Páginas]
    ↓                                                    ↓
[7.0 Testes]                                   [14.0 Routes+Sidebar+ObraDetail]
```
