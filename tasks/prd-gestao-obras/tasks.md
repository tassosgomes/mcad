# Resumo de Tarefas — F03: Gestão de Obras Musicais

## Visão Geral

Implementação completa do CRUD de Obras Musicais com integração API ISWC externa e mecanismo de depuração. São 17 tarefas em 3 lanes paralelas: Backend (Tasks 1-9), Frontend Design (Task 10) e Frontend Dev (Tasks 11-17).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `dotnet-architecture` | Clean Architecture, CQRS, Repository, factory methods, entidade com lógica |
| `dotnet-code-quality` | FluentValidation, error handling, ProblemDetails |
| `dotnet-testing` | xUnit AAA, Moq, Testcontainers |
| `dotnet-dependency-config` | HttpClient + Polly para API ISWC |
| `react-architecture` | Estrutura de feature, hooks, path aliases |
| `frontend-design` | Design system Circuit Core Dark |
| `common/restful-api` | Sub-resources, ProblemDetails, paginação |

## Fases de Implementação

### Fase 1 — Domain + Infra + Stitch (Tasks 1-3, 10-11)
Entidade, enums, repositório, migration, IswcService, mockups. Backend e frontend em paralelo.

### Fase 2 — Application Core (Tasks 4-6, 12-13)
Queries, Commands CRUD, Commands especiais (ISWC + Depurar + DP). Frontend types + API + hooks.

### Fase 3 — Integração + Testes (Tasks 7-9, 14-17)
Endpoints, testes backend, componentes frontend, páginas e rotas.

## Tarefas

### Lane A — Backend (.NET 8)
- [ ] 1.0 Domain: Entidade ObraMusical, Enums, IObraRepository, IIswcService
- [ ] 2.0 Infra: ObraMusicalConfiguration, Migration e ObraRepository
- [ ] 3.0 Infra: IswcService (HttpClient + Polly) + Exceptions
- [ ] 4.0 Application: Queries (Listar + GetById) + Responses
- [ ] 5.0 Application: Commands CRUD (Criar, Atualizar, Excluir) + Validators
- [ ] 6.0 Application: Commands Especiais (ObterIswc, Depurar, AlterarDominioPublico)
- [ ] 7.0 API: ObraEndpoints (8 endpoints) + Program.cs + GlobalExceptionHandler
- [ ] 8.0 Testes Unitários: Entidade + Handlers + IswcService
- [ ] 9.0 Testes Integração: Endpoints completos

### Lane B — Frontend Design
- [ ] 10.0 Stitch: 7 Mockups no projeto mcad

### Lane C — Frontend Dev (React)
- [ ] 11.0 Feature: Types + API (8 funções) + Hooks (8 hooks)
- [ ] 12.0 Feature: Componentes Simples (Table, Filters, Form, DeleteModal)
- [ ] 13.0 Feature: Componentes Especiais (IswcSection, DepuracaoBanner, DepuracaoModal, DPToggle)
- [ ] 14.0 Feature: Páginas (ObrasPage, ObraCreatePage, ObraDetailPage)
- [ ] 15.0 Integração: Routes + Sidebar

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|---|---|---|
| HU-01 (Criar obra) | 1.0, 5.0, 7.0, 11.0, 12.0, 14.0 | Direta |
| HU-02 (Obter ISWC) | 1.0, 3.0, 6.0, 7.0, 11.0, 13.0, 14.0 | Direta |
| HU-03 (Buscar na listagem) | 2.0, 4.0, 7.0, 11.0, 12.0, 14.0 | Direta |
| HU-04 (Editar dados) | 1.0, 5.0, 7.0, 11.0, 12.0, 14.0 | Direta |
| HU-05 (Marcar Domínio Público) | 1.0, 6.0, 7.0, 11.0, 13.0, 14.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|---|---|---|
| RF-01 (criar obra) | 1.0, 5.0, 7.0 | ✅ |
| RF-02 (status PENDENTE) | 1.0 | ✅ |
| RF-03 (sem ISWC na criação) | 5.0 | ✅ |
| RF-04 (edição livre PENDENTE) | 1.0, 5.0 | ✅ |
| RF-05 (ISWC não editável) | 7.0, 12.0 | ✅ |
| RF-06 (alerta depuração) | 5.0, 13.0 | ✅ |
| RF-07 (depuração transacional) | 6.0, 7.0 | ✅ |
| RF-08 (DEPURADA imutável) | 1.0, 14.0 | ✅ |
| RF-09 (nova obra PENDENTE) | 6.0 | ✅ |
| RF-10 (subtítulo/tipo/gênero sem depuração) | 5.0 | ✅ |
| RF-11 (paginação) | 2.0, 4.0, 7.0 | ✅ |
| RF-12 (ordenação) | 2.0, 4.0 | ✅ |
| RF-13 (filtros) | 2.0, 4.0, 12.0 | ✅ |
| RF-14 (colunas tabela) | 12.0 | ✅ |
| RF-15 (botão Obter ISWC) | 13.0 | ✅ |
| RF-16 (habilitado se titulares) | 6.0, 13.0 | ✅ |
| RF-17 (chamada API externa) | 3.0, 6.0 | ✅ |
| RF-18 (ISWC salvo) | 6.0 | ✅ |
| RF-19 (API indisponível → msg) | 3.0, 7.0, 13.0 | ✅ |
| RF-20 (botão desabilitado se já tem) | 13.0 | ✅ |
| RF-21 (ISWC único) | 6.0 | ✅ |
| RF-22 (botão oculto DEPURADA/DP) | 13.0 | ✅ |
| RF-23 (flag Domínio Público) | 1.0, 6.0, 13.0 | ✅ |
| RF-24 (status → DOMINIO_PUBLICO) | 1.0, 6.0 | ✅ |
| RF-25 (desmarcar retorna status) | 1.0, 6.0 | ✅ |
| RF-26 (DP não disponível DEPURADA) | 1.0, 13.0 | ✅ |
| RF-27 (consulta por ID) | 4.0, 7.0 | ✅ |
| RF-28 (404 não existe) | 4.0, 7.0 | ✅ |
| RF-29 (impedir exclusão fonogramas) | 5.0 | ✅ |
| RF-30 (impedir exclusão titularidades) | 5.0 | ✅ |
| RF-31 (impedir exclusão DEPURADA) | 5.0, 7.0 | ✅ |
| RF-32 (exclusão se sem vínculos) | 5.0, 7.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|---|---|---|
| 1 | Setup / Configuração | 3.0 (HttpClient+Polly), 7.0 (Program.cs) | ✅ |
| 2 | Modelos de Dados | 1.0, 2.0 | ✅ |
| 3 | Lógica de Negócio | 5.0, 6.0 | ✅ |
| 4 | Endpoints / Interfaces | 7.0 | ✅ |
| 5 | Integrações Externas | 3.0 (IswcService) | ✅ |
| 6 | Validações e Erros | 3.0, 5.0, 6.0, 7.0 | ✅ |
| 7 | Testes | 8.0, 9.0 | ✅ |
| 8 | Observabilidade | 7.0 (logging) | ✅ |
| 9 | Documentação | 10.0 (Stitch) | ✅ |
| 10 | Segurança | N/A — auth retroativa | ✅ |

## Análise de Paralelização

### Lanes

| Lane | Tarefas | Descrição |
|---|---|---|
| Lane A (Backend) | 1→2/3→4/5/6→7→8→9 | API .NET CRUD + ISWC + Depuração |
| Lane B (Design) | 10 | Stitch mockups |
| Lane C (Frontend) | 11→12/13→14→15 | React CRUD + ISWC + Depuração |

### Diagrama de Dependências

```
Lane A (Backend)                   Lane B        Lane C (Frontend)

[1.0 Domain]                       [10.0 Stitch] [11.0 Types+API+Hooks]
    ↓                                                    ↓
[2.0 Infra] ║ [3.0 IswcService]                 [12.0 Comp Simples] ║ [13.0 Comp Especiais]
    ↓              ↓                                     ↓                    ↓
[4.0 Queries] ║ [5.0 Cmds CRUD] ║ [6.0 Cmds Esp] [14.0 Páginas]
    ↓               ↓                ↓                   ↓
[7.0 API Endpoints] ·············→ (integração) ← [15.0 Routes+Sidebar]
    ↓
[8.0 Testes Unit] → [9.0 Testes Integração]
```
