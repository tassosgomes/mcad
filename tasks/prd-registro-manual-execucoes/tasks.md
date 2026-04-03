# Resumo de Tarefas — F02: Registro Manual de Execuções

## Visão Geral

Implementação do CRUD de execuções musicais dentro de captações, com busca integrada ao Cadastro, criação inline de obras/fonogramas pendentes, campos condicionais por rubrica e cálculo automático de duração. Envolve dois serviços: Identificação API (principal) e Cadastro API (novo endpoint de busca).

## Skills de Stack Consultadas

| Skill | Influência |
|-------|------------|
| `csharp-dotnet-architecture` | Clean Architecture, CQRS, namespaces por agregado |
| `dotnet-testing` | xUnit + AwesomeAssertions + Moq, padrão AAA |
| `react-architecture` | Feature modules, hooks, componentes de domínio |
| `common-restful-api` | Sub-recurso, RFC 7807, códigos de erro |

## Fases de Implementação

### Fase 1 — Cadastro API: Endpoint de Busca (Task 1)
Dependência bloqueante. Novo endpoint no Cadastro que a Identificação consome.

### Fase 2 — Identificação Backend (Tasks 2-5)
Domain, Infra, Application e API da entidade Execução no serviço de Identificação.

### Fase 3 — Frontend (Tasks 6-9)
Mockups, types/hooks, componentes e integração na CaptacaoDetailPage.

## Tarefas

- [x] 1.0 Cadastro API — Endpoint de Busca Unificada
- [x] 2.0 Backend — Domain Layer (Execução, TipoUtilização, Interfaces)
- [x] 3.0 Backend — Infrastructure (DbContext, Migration, Seeds, Repos, HttpClient)
- [ ] 4.0 Backend — Application Layer (Commands, Queries, Handlers)
- [ ] 5.0 Backend — API (Endpoints, Program.cs updates)
- [ ] 6.0 Frontend — Mockups no Stitch
- [ ] 7.0 Frontend — Types, API Clients e Hooks
- [ ] 8.0 Frontend — Componentes
- [ ] 9.0 Frontend — Integração na CaptacaoDetailPage

## Rastreabilidade RF → Tasks

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — Buscar obra/fonograma no Cadastro | 1.0, 7.0, 8.0 | ✅ Coberto |
| RF-02 — Adicionar execução | 2.0, 4.0, 5.0, 8.0, 9.0 | ✅ Coberto |
| RF-03 — Criar obra/fonograma pendente inline | 1.0, 7.0, 8.0 | ✅ Coberto |
| RF-04 — Listar execuções | 4.0, 5.0, 7.0, 8.0, 9.0 | ✅ Coberto |
| RF-05 — Editar execução | 4.0, 5.0, 7.0, 8.0, 9.0 | ✅ Coberto |
| RF-06 — Excluir execução | 4.0, 5.0, 7.0, 8.0, 9.0 | ✅ Coberto |
| RF-07 — Campos condicionais por rubrica | 4.0, 8.0 | ✅ Coberto |
| RF-08 — Cálculo automático de duração | 2.0, 8.0 | ✅ Coberto |

## Validação de Cobertura

### Artefatos Backend — Identificação

| Artefato | Task | Status |
|----------|------|--------|
| `Execucao.cs`, `TipoUtilizacao.cs`, `StatusExecucao.cs` | 2.0 | ✅ |
| `IExecucaoRepository`, `ITipoUtilizacaoRepository`, `ICadastroHttpClient` | 2.0 | ✅ |
| DbContext update, Configurations, Migration, Seeds | 3.0 | ✅ |
| `ExecucaoRepository`, `TipoUtilizacaoRepository`, `CadastroHttpClient` | 3.0 | ✅ |
| Commands (Criar, Atualizar, Excluir) + Handlers + Validators | 4.0 | ✅ |
| Queries (ListarExecucoes, ListarTiposUtilizacao) + Handlers | 4.0 | ✅ |
| Responses, GetCaptacaoByIdQueryHandler update (resumo real) | 4.0 | ✅ |
| `ExecucaoEndpoints.cs`, `TipoUtilizacaoEndpoints.cs`, Program.cs | 5.0 | ✅ |
| Testes unitários (domain + handlers) | 2.0, 4.0 | ✅ |

### Artefatos Backend — Cadastro

| Artefato | Task | Status |
|----------|------|--------|
| `BuscaEndpoints.cs`, Query, Handler, Response | 1.0 | ✅ |
| `BuscarAsync` em ObraRepository e FonogramaRepository | 1.0 | ✅ |

### Artefatos Frontend

| Artefato | Task | Status |
|----------|------|--------|
| Mockups Stitch (6 telas) | 6.0 | ✅ |
| `execucao.ts` (types) | 7.0 | ✅ |
| `execucoesApi.ts`, `buscaCadastroApi.ts` | 7.0 | ✅ |
| 8 hooks | 7.0 | ✅ |
| `BuscaCadastroAutocomplete` + CSS | 8.0 | ✅ |
| `ExecucaoFormModal` + CSS | 8.0 | ✅ |
| `ExecucoesTable` + CSS | 8.0 | ✅ |
| `CriarObraPendenteModal` + CSS | 8.0 | ✅ |
| `CriarFonogramaPendenteModal` + CSS | 8.0 | ✅ |
| `DeleteExecucaoModal` + CSS | 8.0 | ✅ |
| `ExecucoesSection` + CSS | 8.0 | ✅ |
| `CaptacaoDetailPage.tsx` (modificação) | 9.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Status |
|---|-----------|---------------|--------|
| 1 | Setup / Configuração | 3.0 (HttpClient), 5.0 (.env) | ✅ |
| 2 | Modelos de Dados | 2.0, 3.0 | ✅ |
| 3 | Lógica de Negócio | 2.0, 4.0 | ✅ |
| 4 | Endpoints / Interfaces | 1.0, 5.0 | ✅ |
| 5 | Integrações Externas | 3.0 (CadastroHttpClient) | ✅ |
| 6 | Validações e Erros | 4.0 (validators, campos condicionais) | ✅ |
| 7 | Testes | Subtarefas em 2.0, 4.0 | ✅ |
| 8 | Observabilidade | 5.0 (logging em HttpClient) | ✅ |
| 9 | Documentação | 5.0 (.env.example) | ✅ |
| 10 | Segurança | 5.0 (auth policies, propriedade do analista) | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Cadastro) | 1.0 | Endpoint de busca — independente |
| Lane B (Identificação Backend) | 2.0 → 3.0 → 4.0 → 5.0 | Sequencial por camada |
| Lane C (Mockups) | 6.0 | Independente |
| Lane D (Frontend) | 7.0 → 8.0 → 9.0 | Sequencial, inicia após api-contract |

### Caminho Crítico

```
1.0 (Cadastro busca) ────────────→ 3.0 (HttpClient depende de 1.0)
2.0 (Domain) → 3.0 (Infra) → 4.0 (Application) → 5.0 (API)
                                                       │
6.0 (mockups) ──────────────────────────────────→ 8.0 → 9.0
7.0 (types/hooks) ──────────────────────────────→ 8.0
```

### Diagrama de Dependências

```
1.0 (Cadastro) ──────────────────┐
                                  ▼
2.0 (Domain) ──→ 3.0 (Infra) ──→ 4.0 (App) ──→ 5.0 (API)
                                                     │
6.0 (Stitch) ───────────────────────────────────→ 8.0 → 9.0
7.0 (types/hooks) ─────────────────────────────→ 8.0
```

**Tasks paralelas desde o início:** 1.0, 2.0, 6.0, 7.0
