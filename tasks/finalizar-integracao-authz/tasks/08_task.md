---
status: pending
parallelizable: false
blocked_by: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0"]
---

<task_context>
<domain>testing/e2e</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>high</complexity>
<dependencies>docker,playwright,http_server</dependencies>
<unblocks>"9.0"</unblocks>
</task_context>

# Tarefa 8.0: Suite E2E Playwright — 10 cenários CT-E2E-01..10 com compose local

## Relacionada às User Stories

- US-02 — QA roda pnpm e2e verde em ≤ 5min (cobertura direta)
- US-01, US-03, US-04 — suporte

## Visão Geral

Cria suite Playwright determinística que valida os fluxos críticos de autorização end-to-end. **É o item de maior valor desta entrega.** Compõe stack containerizada com Logto + ecad-authz + 4 APIs MCAD + BFF + Frontend; aplica seed; executa 10 cenários focados.

Referência canônica de padrão: `ecad-authz/tooling/e2e/` (8 specs já validadas).

## Requisitos

- Stack containerizada via `docker-compose.e2e.yml`: PostgreSQL (×N schemas), Redis, RabbitMQ, Logto, ecad-authz, cadastro-api, identificacao-api, arrecadacao-api, distribuicao-api, BFF, Frontend
- Logto realm seedado via API ou import com 6 usuários de teste (`consultor_geral.dev`, `analista_{cadastro,identificacao,arrecadacao,distribuicao}.dev`, `sem.papel.dev`)
- Seed via `scripts/seed-authz.sh` adaptado ao ambiente E2E (URL e token via env vars)
- Playwright 1.45+; config com `webServer` ou compose iniciado fora; `use.baseURL`
- 10 specs (uma por arquivo) cobrindo CT-E2E-01..10
- Tempo total ≤ 5 min; sem flakes ≥ 1%
- Pipeline CI em `.github/workflows/mcad-e2e.yml` publicando relatório HTML como artifact

## Arquivos Envolvidos

- **Criar:**
  - `mcad/tooling/e2e/package.json` (workspace `@mcad/e2e`)
  - `mcad/tooling/e2e/playwright.config.ts`
  - `mcad/tooling/e2e/docker-compose.e2e.yml`
  - `mcad/tooling/e2e/logto/realm-mcad-test.json` (ou script `seed-logto.sh`)
  - `mcad/tooling/e2e/fixtures/seed-e2e.sh` (wrapper)
  - `mcad/tooling/e2e/utils/loginAs.ts`
  - `mcad/tooling/e2e/utils/api.ts`
  - `mcad/tooling/e2e/utils/revokeSession.ts`
  - `mcad/tooling/e2e/utils/clock.ts`
  - `mcad/tooling/e2e/tests/01-login-consultor.spec.ts` (CT-E2E-01)
  - `mcad/tooling/e2e/tests/02-login-analista.spec.ts` (CT-E2E-02)
  - `mcad/tooling/e2e/tests/03-sem-papel.spec.ts` (CT-E2E-03)
  - `mcad/tooling/e2e/tests/04-forge-cadastro.spec.ts` (CT-E2E-04)
  - `mcad/tooling/e2e/tests/05-forge-cross-domain.spec.ts` (CT-E2E-05)
  - `mcad/tooling/e2e/tests/06-distribuicao-calculo.spec.ts` (CT-E2E-06)
  - `mcad/tooling/e2e/tests/07-version-push.spec.ts` (CT-E2E-07)
  - `mcad/tooling/e2e/tests/08-session-revoke.spec.ts` (CT-E2E-08)
  - `mcad/tooling/e2e/tests/09-audit-filter.spec.ts` (CT-E2E-09)
  - `mcad/tooling/e2e/tests/10-logout.spec.ts` (CT-E2E-10)
  - `mcad/tooling/e2e/README.md`
  - `mcad/.github/workflows/mcad-e2e.yml`
- **Modificar:**
  - `mcad/pnpm-workspace.yaml` ou root `package.json` para incluir `tooling/e2e`
  - `mcad/scripts/seed-authz.sh` (se precisar de modo `--e2e` que aceita URL/token via env)
- **Referência (modelo):**
  - `ecad-authz/tooling/e2e/tests/{01-login,...,08-logout}.spec.ts`
  - `ecad-authz/tooling/e2e/utils/{loginAs,seedAuthz,clock}.ts`
  - `ecad-authz/tooling/e2e/docker-compose.e2e.yml`
  - `ecad-authz/.github/workflows/e2e.yml`
- **Skills para consultar durante implementação:**
  - `react-testing` — Playwright patterns (selectors, network mocking, fixtures)

## Subtarefas

- [ ] 8.1 `docker-compose.e2e.yml` orquestrando todos os serviços + healthchecks
- [ ] 8.2 Seed Logto: realm `mcad-test` com 6 usuários e client configurado
- [ ] 8.3 Adaptar `scripts/seed-authz.sh` para receber `AUTHZ_BASE_URL` e `AUTHZ_ADMIN_TOKEN` via env
- [ ] 8.4 `loginAs(page, persona)`: faz login OIDC via Logto e retorna page autenticada com cookie de sessão do BFF
- [ ] 8.5 `revokeSession(sessionId)`: helper que chama `POST /v1/sessions/{id}/revoke` via API admin
- [ ] 8.6 Implementar specs 01..10 (cada ≤ 30s; cenários ver tabela abaixo)
- [ ] 8.7 `playwright.config.ts` com `webServer` que sobe compose ou checa healthcheck antes
- [ ] 8.8 README com `pnpm e2e:local`, `pnpm e2e:compose:up`, `pnpm e2e:compose:down`
- [ ] 8.9 Workflow CI publicando `playwright-report` como artifact

## Sequenciamento

- Bloqueado por: 1.0, 2.0 (frontend correto), 3.0–7.0 (backends + BFF estáveis)
- Desbloqueia: 9.0
- Paralelizável: **Não** (precisa da stack toda)

## Rastreabilidade

- Cobre: US-02 (direta); US-01/03/04 (suporte)
- Evidência: relatório HTML + 10 cenários verdes em ≤ 5 min

## Detalhes de Implementação

### Cenários (resumo do plano aprovado §D)

| ID | Spec | Resumo |
|----|------|--------|
| CT-E2E-01 | `01-login-consultor.spec.ts` | Login `consultor_geral.dev` → sidebar mostra Cadastro/Identificacao/Arrecadacao sem botões de escrita |
| CT-E2E-02 | `02-login-analista.spec.ts` | Login `analista_cadastro.dev` → sidebar mostra Cadastro com "Nova obra"/"Editar" |
| CT-E2E-03 | `03-sem-papel.spec.ts` | Login `sem.papel.dev` → `/access-denied` ou landing vazia; navegação para módulos = 403 |
| CT-E2E-04 | `04-forge-cadastro.spec.ts` | Consultor faz `POST /api/v1/obras` direto (URL forjada) → 403 `PERMISSION_DENIED` |
| CT-E2E-05 | `05-forge-cross-domain.spec.ts` | Analista_cadastro faz `POST /api/v1/captacoes` → 403 |
| CT-E2E-06 | `06-distribuicao-calculo.spec.ts` | Analista_distribuicao acessa `/distribuicao/processos/{id}/calcular` → botão visível e POST funciona (valida refactor da Task 1.0) |
| CT-E2E-07 | `07-version-push.spec.ts` | Atribuir role enquanto logado → em ≤ 2s UI mostra novos botões (via X-Authz-Version) |
| CT-E2E-08 | `08-session-revoke.spec.ts` | `POST /v1/sessions/{id}/revoke` → próxima requisição 401 em ≤ 5s |
| CT-E2E-09 | `09-audit-filter.spec.ts` | `/autorizacao/auditoria` filtra por `actorId` → mostra `RoleAssignedToUser`, `PermissionGranted` |
| CT-E2E-10 | `10-logout.spec.ts` | Logout → cookie limpo + redirect Logto |

### Exemplo (CT-E2E-04):

```ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/loginAs';

test('CT-E2E-04: consultor recebe 403 em POST /api/v1/obras (URL forjada)', async ({ page, request }) => {
  await loginAs(page, 'consultor_geral.dev');
  // Recupera token/cookie de sessão depois do login
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'mcad-session');

  const resp = await request.post('http://localhost:5001/api/v1/obras', {
    headers: { Cookie: `mcad-session=${sessionCookie!.value}` },
    data: { titulo: 'forjada', /* ... */ },
  });

  expect(resp.status()).toBe(403);
  const body = await resp.json();
  expect(body.code).toBe('PERMISSION_DENIED');
  expect(body.correlationId).toBeTruthy();
});
```

**Convenções da stack:**
- `react-testing` (Playwright): selectors via `getByRole`/`getByLabel`; nunca CSS específico
- Cada spec ≤ 30s; usar `test.slow()` para cenários que dependem de propagação assíncrona (CT-E2E-07, CT-E2E-08)

### Cuidados

- **Logto vs Keycloak:** decisão registrada no `techspec.md §4.1`: usar Logto containerizado. Se a licença/imagem inviabilizar CI, fallback Keycloak (adicionar adapter no BFF para mapear claims).
- **Cleanup entre testes:** isolar com `test.beforeEach` que reseta cookies + chama um endpoint de revogação se necessário.
- **Tempos:** CT-E2E-07 e CT-E2E-08 precisam aguardar mudança propagada; usar `expect(...).toPass({ timeout: 5000 })` em vez de `waitForTimeout`.

## Critérios de Sucesso (Verificáveis)

- [ ] `cd mcad && pnpm --filter @mcad/e2e e2e` executa 10 specs em ≤ 5min
- [ ] 0 falhas (após 1 retry de cada spec, se necessário, sem regressão flake)
- [ ] Workflow `mcad-e2e.yml` em CI publica artifact `playwright-report`
- [ ] README cobre: como rodar local, como rodar em CI, como debugar (logs do compose)
- [ ] Cenário 7 confirma reload de contexto em < 2s
- [ ] Cenário 8 confirma 401 em < 5s
- [ ] `relatorio-final.md` atualizado com "Validação E2E concluída em <data> (10/10 cenários verdes)"
