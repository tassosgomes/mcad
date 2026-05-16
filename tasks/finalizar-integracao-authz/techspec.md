# TechSpec — Finalização da Integração ecad-authz × MCAD

> Companheiro do `prd.md` deste diretório.
> Fonte canônica dos cenários: `/home/tsgomes/.claude/plans/analise-o-projeto-ecad-authz-delightful-dahl.md`.

## 1. Visão Geral

A integração está funcionalmente concluída em produção. Esta entrega adiciona **cobertura de testes** + **limpeza de débitos pequenos** sem alterar arquitetura, contratos ou dependências.

### Stacks envolvidas

| Componente | Stack | Tipo de teste alvo |
|------------|-------|--------------------|
| `services/cadastro-api` | .NET 8 + xUnit + Testcontainers (PostgreSQL) | integration (`AuthEndpointsTests.cs`) |
| `services/identificacao-api` | .NET 8 + xUnit + Testcontainers | integration |
| `services/arrecadacao-api` | Java 21 + Spring Boot 3.3 + JUnit 5 + AssertJ + Testcontainers | integration (`AuthzPermissionEnforcementTest.java`) |
| `services/distribuicao-api` | Java 21 + Spring Boot 3.3 + JUnit 5 + Testcontainers | integration |
| `services/bff` | Node + TypeScript + tap/jest (ver `package.json`) | integration |
| `frontend/` | React 19 + Vite + Vitest + RTL | unit |
| `tooling/e2e/` (a criar) | Playwright 1.45+ + axe-playwright | e2e + a11y |

## 2. Skills de Referência

Cada task aponta as skills relevantes para o agente de código consultar. Lista consolidada:

- `dotnet-testing` / `csharp-testing` — naming, AAA, Testcontainers
- `java-testing` — JUnit 5, AssertJ, Testcontainers, @WebMvcTest
- `react-testing` — Vitest, RTL, MSW
- `react-code-quality` — TS estrito, hooks patterns
- `common-restful-api` — versioning, error envelope (`ErrorResponse {code, message, correlationId, details}`)

## 3. Inventário de Artefatos

### A modificar

| Arquivo | O que muda |
|---------|------------|
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` | Refactor `hasRole('analista-distribuicao')` → `can('distribuicao:default:processo:calcular')` |
| `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.test.tsx` | Adaptar para mockar `usePermissions` em vez de `useAuth.hasRole` |
| `frontend/src/shared/auth/AuthProvider.tsx` | Remover `hasRole` e referências |
| `frontend/src/shared/auth/AuthContext.tsx` | Remover `hasRole` da interface |
| `frontend/src/features/copiloto/pages/CopilotoPage.test.tsx` | Adaptar mock (consumia `hasRole`) |
| `frontend/src/shared/components/layout/sidebar/Sidebar.tsx` | Validar/atualizar `requiredPermissions` para "Auditoria" e "Copiloto" |
| `frontend/src/app/router/routes.tsx` | Idem para rotas |
| `services/cadastro-api/5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs` | Ampliar cobertura (matriz 3 estados por endpoint) |
| `services/identificacao-api/5-Tests/Identificacao.IntegrationTests/AuthEndpointsTests.cs` | Idem |
| `services/arrecadacao-api/arrecadacao-tests/.../AuthzPermissionEnforcementTest.java` | Ampliar — cobrir todos os controllers anotados |
| `services/distribuicao-api/distribuicao-tests/.../AuthzPermissionEnforcementTest.java` | Ampliar (já criado em F02) |
| `services/bff/src/server.test.ts` (ou nome equivalente) | Adicionar cenários CT-BFF-R01..R05 |
| `docs/migracao-authz/prd.md` | Atualizar checklist da Tarefa 20 |
| `docs/migracao-authz/relatorio-final.md` | Adicionar nota de validação E2E |

### A criar

| Arquivo | Conteúdo |
|---------|----------|
| `tooling/e2e/playwright.config.ts` | Config Playwright apontando para `docker-compose.dev.yml` |
| `tooling/e2e/package.json` | Workspace `@mcad/e2e` com scripts `e2e`, `e2e:local`, `e2e:compose:up`, `e2e:compose:down` |
| `tooling/e2e/docker-compose.e2e.yml` | Orquestra Postgres, Redis, RabbitMQ, Logto, ecad-authz, 4 APIs MCAD, BFF, Frontend |
| `tooling/e2e/fixtures/seed-e2e.sh` | Wrapper sobre `scripts/seed-authz.sh` para o ambiente E2E |
| `tooling/e2e/utils/loginAs.ts` | Helper Playwright que loga via Logto e retorna page autenticada |
| `tooling/e2e/utils/api.ts` | Helpers cURL/fetch para chamadas diretas às APIs |
| `tooling/e2e/utils/revokeSession.ts` | Helper para `POST /v1/sessions/{id}/revoke` |
| `tooling/e2e/tests/01-login-consultor.spec.ts` | CT-E2E-01 |
| `tooling/e2e/tests/02-login-analista.spec.ts` | CT-E2E-02 |
| `tooling/e2e/tests/03-sem-papel.spec.ts` | CT-E2E-03 |
| `tooling/e2e/tests/04-forge-cadastro.spec.ts` | CT-E2E-04 (URL forjada Cadastro) |
| `tooling/e2e/tests/05-forge-cross-domain.spec.ts` | CT-E2E-05 |
| `tooling/e2e/tests/06-distribuicao-calculo.spec.ts` | CT-E2E-06 |
| `tooling/e2e/tests/07-version-push.spec.ts` | CT-E2E-07 |
| `tooling/e2e/tests/08-session-revoke.spec.ts` | CT-E2E-08 |
| `tooling/e2e/tests/09-audit-filter.spec.ts` | CT-E2E-09 |
| `tooling/e2e/tests/10-logout.spec.ts` | CT-E2E-10 |
| `tooling/e2e/tests/a11y/login.a11y.spec.ts` | CT-A11Y-01 |
| `tooling/e2e/tests/a11y/cadastro-obras.a11y.spec.ts` | CT-A11Y-02 |
| `tooling/e2e/tests/a11y/autorizacao-papeis.a11y.spec.ts` | CT-A11Y-03 |
| `tooling/e2e/tests/a11y/auditoria.a11y.spec.ts` | CT-A11Y-04 |
| `.github/workflows/e2e.yml` (já existe no ecad-authz; adaptar para MCAD ou criar `mcad-e2e.yml`) | Pipeline E2E |

### Referência (não alterar — usar como modelo)

- `ecad-authz/tooling/e2e/tests/{01-login,...,08-logout}.spec.ts` — 8 specs canônicas
- `ecad-authz/tooling/e2e/utils/{loginAs,seedAuthz,clock}.ts` — utilitários
- `ecad-authz/tooling/e2e/keycloak/realm-ecad-test.json` — modelo de seed IdP (adaptar para Logto)
- `scripts/seed-authz.sh` + `seeds/mcad/*.json` — dados pré-cadastrados
- ADRs `docs/adr/0001..0005-*.md`

## 4. Decisões Técnicas

### 4.1 IdP para E2E

MCAD usa **Logto** em produção/staging. Para E2E local há 2 opções:
- (A) Subir Logto containerizado e seedar realm via API (caminho consistente com prod)
- (B) Usar Keycloak (já presente no ecad-authz/tooling/e2e) com adaptador no BFF

**Decisão:** opção (A) — Logto containerizado. O BFF e o ecad-authz já estão configurados para Logto em prod; reusar mantém o caminho de teste alinhado.

### 4.2 Como cobrir CT-E2E-04 e CT-E2E-05 (URLs forjadas)

Playwright dispara `request.post(...)` autenticado com cookie/Bearer do consultor diretamente nas APIs (sem passar pelo BFF). Valida 403 com `{code: "PERMISSION_DENIED"}`.

### 4.3 Como cobrir CT-E2E-07 (version push)

Atribuir role via `POST /v1/users/{id}/roles` enquanto a página está aberta. Aguardar refetch implícito (TTL do cache do BFF é ≤ 60s, mas com `X-Authz-Version` é instantâneo). Validar que botão de escrita aparece sem reload manual.

### 4.4 Padrão de mock no .NET

Não mockar `IAuthorizationService` — usar `WebApplicationFactory` com `AuthEnabled=true` apontando para `MockEcadAuthzServer` (mock HTTP) que devolve `{Allowed: true|false}` conforme o cenário. Modelo já existe em `Cadastro.IntegrationTests/AuthEndpointsTests.cs`.

### 4.5 Padrão de mock no Java

Idem ao .NET: `@SpringBootTest` com `AuthzDecisionClient` apontando para `WireMock` configurado por cenário. Modelo em `arrecadacao-tests/.../AuthzPermissionEnforcementTest.java`.

## 5. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Logto containerizado tem licença incompatível com CI | Validar antes de C.0. Fallback: Keycloak com adapter |
| Suite E2E quebra por flakes de timing (cache BFF) | Usar wait explícito ≤ 5s; testar com network throttling local |
| Testes ampliados degradarem performance da CI | Paralelizar com `maxWorkers=4`; rodar E2E em job separado |
| Refactor `hasRole` quebrar telas escondidas | Inventário exaustivo via grep antes do refactor; testes de smoke nas 4 telas |

## 6. Verificação Esperada por Etapa

```bash
# Frontend (após Task 1)
cd mcad/frontend && npm test -- ProcessoCalculo Sidebar AuthProvider

# Backends regressão (após Tasks 3,4,5,6)
cd mcad/services/cadastro-api && dotnet test 5-Tests/Cadastro.IntegrationTests/AuthEndpointsTests.cs
cd mcad/services/identificacao-api && dotnet test 5-Tests/Identificacao.IntegrationTests/AuthEndpointsTests.cs
cd mcad/services/arrecadacao-api && mvn -pl arrecadacao-tests test -Dtest=AuthzPermissionEnforcementTest
cd mcad/services/distribuicao-api && mvn -pl distribuicao-tests test -Dtest=AuthzPermissionEnforcementTest

# BFF (após Task 7)
cd mcad/services/bff && npm test

# E2E (após Task 8)
cd mcad && pnpm --filter @mcad/e2e e2e

# A11y (após Task 9)
pnpm --filter @mcad/e2e e2e -- --grep @a11y
```
