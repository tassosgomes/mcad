---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>backend/bff</domain>
<type>testing</type>
<scope>middleware</scope>
<complexity>low</complexity>
<dependencies>http_server</dependencies>
<unblocks>"8.0"</unblocks>
</task_context>

# Tarefa 7.0: BFF — ampliar `server.test.ts` cobrindo CT-BFF-R01..R05

## Relacionada às User Stories

- US-01, US-03 — cobertura direta

## Visão Geral

BFF já tem 15/15 testes verdes (incluindo 8 para `/api/me*`). Esta task **valida e amplia** caso falte: cobrir os 5 cenários CT-BFF-R01..R05 com foco em `X-Authz-Version` (cache invalidation) e fallback 503 quando ecad-authz está down. Normalizer 3→4-seg já foi removido — confirmar que o teste correspondente também foi removido.

## Requisitos

- CT-BFF-R01: `GET /api/me/permissions` sem cookie → 401
- CT-BFF-R02: com sessão válida; ecad-authz responde 200 com 41 perms → 200 com payload correto
- CT-BFF-R03: ecad-authz responde com `X-Authz-Version` diferente da cache → cache invalidada
- CT-BFF-R04: ecad-authz 503 → BFF responde 503 com `ErrorResponse` mantendo `correlationId`
- CT-BFF-R05: confirmar que o teste do normalizer 3-seg foi removido (deve ser no-op agora)

## Arquivos Envolvidos

- **Modificar:**
  - `mcad/services/bff/src/server.test.ts` (ou `meRoutes.test.ts` — confirmar localização)
- **Referência:**
  - `mcad/services/bff/src/server.ts`
  - `mcad/services/bff/src/meRoutes.ts` (sem normalizer após commit `b0418e9`)
  - `mcad/services/bff/src/meCache.ts`
  - `mcad/services/bff/package.json` (framework de teste: `tap`/`jest`/`vitest`)
- **Skills para consultar durante implementação:**
  - `react-testing` (compartilha conceito de mock HTTP) — ou skill específica de Node/TS se existir
  - `common-restful-api` — `ErrorResponse`

## Subtarefas

- [ ] 7.1 Inspecionar testes existentes em `server.test.ts` / `meRoutes.test.ts`; mapear quais cobrem CT-BFF-R01..R05
- [ ] 7.2 Adicionar/ampliar mock HTTP para o ecad-authz (`nock` ou `msw`)
- [ ] 7.3 Implementar CT-BFF-R03: chamada 1 retorna `X-Authz-Version: v1`; chamada 2 (dentro do TTL) ainda retorna v1; depois ecad-authz devolve `X-Authz-Version: v2` → próxima chamada do BFF deve re-fetchar
- [ ] 7.4 Implementar CT-BFF-R04: stub 503 do upstream → BFF responde 503 + body `{code: "UPSTREAM_UNAVAILABLE", correlationId: <propagado>}`
- [ ] 7.5 Confirmar remoção do teste de normalizer 3→4 (validar com grep `normalizePermissionKey`)
- [ ] 7.6 Atualizar README do BFF (`services/bff/README.md`) com seção "Testes de autorização"

## Sequenciamento

- Bloqueado por: Nenhum
- Desbloqueia: 8.0
- Paralelizável: Sim

## Rastreabilidade

- Cobre: US-01, US-03
- Evidência: `npm test` ≥ 15 + novos cenários

## Detalhes de Implementação

Exemplo (assumindo `tap`/`vitest`):

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import nock from 'nock';

describe('GET /api/me/permissions', () => {
  beforeEach(() => nock.cleanAll());

  it('returns 401 when cookie is missing', async () => {
    const resp = await fetch('http://localhost:3000/api/me/permissions');
    expect(resp.status).toBe(401);
  });

  it('refetches when X-Authz-Version changes', async () => {
    const scope = nock('http://ecad-authz')
      .get('/v1/me/authorization-context')
      .reply(200, { permissions: ['cadastro:default:obra:listar'] }, { 'X-Authz-Version': 'v1' })
      .get('/v1/me/authorization-context')
      .reply(200, { permissions: ['cadastro:default:obra:listar', 'cadastro:default:obra:criar'] }, { 'X-Authz-Version': 'v2' });

    // call 1
    let resp = await fetchWithSession();
    expect((await resp.json()).permissions).toHaveLength(1);

    // call 2 (cache hit since same v1) — without bumping version on upstream...
    // For this test, we want to simulate upstream having advanced version.
    // Implementation depends on cache strategy — see meCache.ts

    expect(scope.isDone()).toBe(true);
  });

  it('returns 503 with ErrorResponse when ecad-authz is down', async () => {
    nock('http://ecad-authz').get('/v1/me/authorization-context').reply(503);

    const resp = await fetchWithSession();
    expect(resp.status).toBe(503);
    const body = await resp.json();
    expect(body).toMatchObject({
      code: expect.stringMatching(/UPSTREAM|UNAVAILABLE/),
      correlationId: expect.any(String),
    });
  });
});
```

**Convenções da stack:**
- TypeScript estrito
- `nock` para mock HTTP (já usado em outros lugares do BFF — confirmar)
- Naming behavior-driven (`returns 401 when...`)

## Critérios de Sucesso (Verificáveis)

- [ ] Testes passam: `cd mcad/services/bff && npm test`
- [ ] Build: `cd mcad/services/bff && npm run build`
- [ ] Lint (se existir): `npm run lint`
- [ ] Total mantém-se ≥ 15 + novos
- [ ] grep limpo: `grep -rn "normalizePermissionKey" mcad/services/bff/src` retorna 0 linhas (já removido em `b0418e9`)
