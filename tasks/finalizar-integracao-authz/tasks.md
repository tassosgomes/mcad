# Resumo de Tarefas — Finalização da Integração ecad-authz × MCAD

## Visão Geral

Fechar os gaps táticos da migração ecad-authz × MCAD (concluída em 2026-05-15) entregando:
1. Limpeza de `hasRole` no frontend (G1–G3 do plano aprovado)
2. Ampliação da regressão de autorização nos 4 backends + BFF (CT-*-R*)
3. Suite E2E Playwright cobrindo 10 cenários (CT-E2E-*)
4. Baseline a11y (CT-A11Y-*)

Sem alteração de arquitetura ou contratos. Foco em **cobertura de testes** e remoção de débitos pequenos.

## Skills de Stack Consultadas

| Skill | Caminho | Influência |
|-------|---------|------------|
| `dotnet-testing` / `csharp-testing` | skill global | xUnit AAA, Testcontainers, `WebApplicationFactory`, naming `Method_When_Then` |
| `csharp-code-quality` | skill global | Nullable strict, async/await, sem `Exception` genérica |
| `java-testing` | skill global | JUnit 5 + AssertJ + Mockito, Testcontainers (PostgreSQL), `@SpringBootTest` |
| `java-code-quality` | skill global | Padrões de exception, logging estruturado |
| `react-testing` | skill global | Vitest + RTL + MSW, behavior-driven naming, Playwright |
| `react-code-quality` | skill global | TS estrito, hooks patterns, sem `any` |
| `common-restful-api` | skill global | Envelope `ErrorResponse {code, message, correlationId, details}` |
| `common-roles-naming` | skill global | Permissões 4-seg `dominio:default:recurso:acao` |

## Fases de Implementação

### Fase 1 — Frontend cleanup (paralelo)
Tasks 1.0 e 2.0. Resolve G1–G3 do plano aprovado, libera CT-E2E-06 e remove débito de hasRole.

### Fase 2 — Regressão backend (paralelo entre serviços)
Tasks 3.0, 4.0, 5.0, 6.0. Ampliam a matriz por API. Independentes entre si.

### Fase 3 — Regressão BFF (paralelo com Fase 2)
Task 7.0.

### Fase 4 — Suite E2E (depende de Fases 1+2+3)
Tasks 8.0 e 9.0. E2E precisa do frontend correto, backends estáveis e BFF testado.

## Tarefas

- [ ] 1.0 Frontend — refactor ProcessoCalculoPage (`hasRole` → `can`) e remoção do `hasRole` deprecated
- [ ] 2.0 Frontend — auditar e atualizar `Sidebar`/`routes` para usar `requiredPermissions` (Auditoria + Copiloto)
- [ ] 3.0 Cadastro API (.NET) — ampliar `AuthEndpointsTests.cs` cobrindo CT-CAD-R01..R07
- [ ] 4.0 Identificacao API (.NET) — ampliar `AuthEndpointsTests.cs` cobrindo CT-IDF-R01..R07
- [ ] 5.0 Arrecadacao API (Java) — ampliar Testcontainers + `AuthzPermissionEnforcementTest` cobrindo CT-ARR-R01..R07
- [ ] 6.0 Distribuicao API (Java) — completar `AuthzPermissionEnforcementTest` cobrindo CT-DIS-R01..R05
- [ ] 7.0 BFF — ampliar `server.test.ts` cobrindo CT-BFF-R01..R05 (cache TTL, X-Authz-Version, fallback 503)
- [ ] 8.0 Suite E2E Playwright — 10 cenários CT-E2E-01..10 com compose local
- [ ] 9.0 A11y baseline — 4 telas (login, cadastro/obras, autorizacao/papeis, auditoria) com axe-playwright

## Rastreabilidade US → Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| US-01 — Dev roda testes locais 100% verde | 3.0, 4.0, 5.0, 6.0, 7.0, 1.0, 2.0 | Direta |
| US-02 — QA roda pnpm e2e verde em ≤ 5min | 8.0 | Direta |
| US-03 — CI bloqueia regressão authz | 3.0–9.0 (via critério "rodar no CI") | Direta |
| US-04 — Checklist T20 do PRD original 100% | 1.0–9.0 + atualização do PRD original | Direta |
| US-05 — A11y baseline zero violações | 9.0 | Direta |

## Validação de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01 — refactor ProcessoCalculoPage | 1.0 | ✅ |
| RF-02 — remover hasRole de AuthProvider/Context | 1.0 | ✅ |
| RF-03 — sidebar/routes usando requiredPermissions | 2.0 | ✅ |
| RF-04 — matriz Cadastro | 3.0 | ✅ |
| RF-05 — matriz Identificacao | 4.0 | ✅ |
| RF-06 — matriz Arrecadacao + Testcontainers ampla | 5.0 | ✅ |
| RF-07 — matriz Distribuicao | 6.0 | ✅ |
| RF-08 — BFF /api/me* | 7.0 | ✅ |
| RF-09 — suite E2E 10 cenários | 8.0 | ✅ |
| RF-10 — a11y baseline | 9.0 | ✅ |

### Artefatos da TechSpec (resumo)

| Artefato | Task | Status |
|----------|------|--------|
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` | 1.0 | ✅ |
| `frontend/src/shared/auth/{AuthProvider,AuthContext}.tsx` | 1.0 | ✅ |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | 2.0 | ✅ |
| `frontend/src/app/router/routes.tsx` | 2.0 | ✅ |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs` | 3.0 | ✅ |
| `services/identificacao-api/5-Tests/Identificacao.IntegrationTests/AuthEndpointsTests.cs` | 4.0 | ✅ |
| `services/arrecadacao-api/arrecadacao-tests/.../AuthzPermissionEnforcementTest.java` | 5.0 | ✅ |
| `services/distribuicao-api/distribuicao-tests/.../AuthzPermissionEnforcementTest.java` | 6.0 | ✅ |
| `services/bff/src/server.test.ts` | 7.0 | ✅ |
| `tooling/e2e/playwright.config.ts` + 10 specs + utils | 8.0 | ✅ |
| `tooling/e2e/tests/a11y/*.a11y.spec.ts` | 9.0 | ✅ |

### Categorias Obrigatórias

| # | Categoria | Task(s) / N/A | Skill Relacionada | Status |
|---|-----------|---------------|-------------------|--------|
| 1 | Setup / Configuração | 8.0 (compose E2E + Logto containerizado) | dotnet-dependency-config, react-architecture | ✅ |
| 2 | Modelos de Dados | N/A — integração de testes não cria entidades | — | ✅ |
| 3 | Lógica de Negócio | N/A — apenas valida lógica existente; refactor cosmético em 1.0 | — | ✅ |
| 4 | Endpoints / Interfaces | 3.0, 4.0, 5.0, 6.0, 7.0 (cobre endpoints existentes) | common-restful-api | ✅ |
| 5 | Integrações Externas | 8.0 (Logto local), 5.0/6.0 (mock HTTP do ecad-authz Decision API) | java-dependency-config | ✅ |
| 6 | Validações e Erros | 3.0–7.0 (assert sobre `ErrorResponse {code, message, correlationId}`) | java-code-quality, csharp-code-quality | ✅ |
| 7 | Testes | TODAS as tasks são testes | dotnet-testing, java-testing, react-testing | ✅ |
| 8 | Observabilidade | N/A — fora do escopo (item futuro: tracing OTEL nas decisões authz) | — | ✅ |
| 9 | Documentação | 8.0 (README do E2E) + atualização do PRD/relatório em cada task | — | ✅ |
| 10 | Segurança | 3.0–8.0 (TODA a entrega valida autorização) | java-production-readiness | ✅ |

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| **Lane Frontend** | 1.0, 2.0 (paralelo entre si) | Refactor + sidebar; sem dependência cruzada |
| **Lane Backend Cadastro** | 3.0 | Independente |
| **Lane Backend Identificacao** | 4.0 | Independente |
| **Lane Backend Arrecadacao** | 5.0 | Independente |
| **Lane Backend Distribuicao** | 6.0 | Independente |
| **Lane BFF** | 7.0 | Independente |
| **Lane E2E** | 8.0 → 9.0 | E2E depende de 1.0+2.0+3.0+4.0+5.0+6.0+7.0 estáveis |

### Caminho Crítico

```
(1.0 + 2.0) → 8.0 → 9.0
```

3.0, 4.0, 5.0, 6.0, 7.0 são paralelos a 1.0+2.0 e desbloqueiam 8.0 junto com elas.

### Diagrama de Dependências

```
        ┌────────┐ ┌────────┐  ┌────────────────────────────┐
        │ 1.0 FE │ │ 2.0 FE │  │ 3.0 .NET Cad   4.0 .NET Id │
        │ Calc   │ │ Sidebar│  │ 5.0 Java Arr   6.0 Java Dis│
        │        │ │        │  │ 7.0 BFF                    │
        └───┬────┘ └───┬────┘  └───────────┬────────────────┘
            │          │                   │
            └──────────┴───────────────────┘
                       │
                       ▼
                  ┌────────┐
                  │ 8.0 E2E│ (10 cenários)
                  └────┬───┘
                       ▼
                  ┌────────┐
                  │ 9.0 A11y│
                  └────────┘
```

### Estimativa de Tempo

| Lane | Esforço |
|------|---------|
| 1.0 | 30 min |
| 2.0 | 30 min |
| 3.0 | 60 min |
| 4.0 | 60 min |
| 5.0 | 90 min (Testcontainers ampla) |
| 6.0 | 45 min |
| 7.0 | 45 min |
| 8.0 | 4 h (suite + compose Logto) |
| 9.0 | 30 min |

**Total sequencial:** ~9h; **com 4 workers em paralelo:** ~5h (caminho crítico = 1.0 → 8.0 → 9.0 = 5h).

## Observações Finais

- Cada task individual (`NN_task.md`) traz **caminhos absolutos**, **subtarefas**, **critérios verificáveis** e referência às skills da stack.
- Fonte canônica dos cenários: `/home/tsgomes/.claude/plans/analise-o-projeto-ecad-authz-delightful-dahl.md`.
- Após conclusão, atualizar:
  - `docs/migracao-authz/prd.md` — checklist T20 (3 itens novos)
  - `docs/migracao-authz/relatorio-final.md` — nota "Validação E2E concluída em <data>"
- Tasks 1.0 e 2.0 podem ser executadas por **flow-implementer** padrão. Task 8.0 é a mais longa e pode demandar split em 8.1 (compose+Logto), 8.2 (helpers), 8.3 (specs) se o time preferir.
