# MCAD BFF

Node.js/Fastify BFF for the MCAD frontend. It exposes frontend-oriented routes,
aggregates authorization context, applies cross-cutting audit rules and proxies
requests to MCAD upstream services.

The BFF must preserve public HTTP contracts. Structural refactors should not
change route paths, response shapes, status codes or headers unless an explicit
contract change was approved.

## Main Routes

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /api/me`
- `GET /api/me/permissions`
- `GET /api/me/dashboard`
- `/api/acessos/*`
- `/api/auditoria/*`
- `/api/autorizacao/permissoes/*`
- `/api/distribuicao/processos/:id/historico`
- `/api/cadastro/v1/*` -> `CADASTRO_API_BASE_URL`
- `/api/identificacao/v1/*` -> `IDENTIFICACAO_API_BASE_URL`
- `/api/arrecadacao/v1/*` -> `ARRECADACAO_API_BASE_URL`
- `/api/distribuicao/v1/*` -> `DISTRIBUICAO_API_BASE_URL`
- `/api/auditoria/v1/*` -> `AUDITORIA_API_BASE_URL`
- `/api/authz/v1/*` -> `AUTHZ_UPSTREAM_BASE_URL`
- `/api/ai/v1/*` -> `AI_ORCHESTRATOR_BASE_URL`
- `/v1/*` -> `AUTHZ_UPSTREAM_BASE_URL` legacy alias
- `/api/v1/*` -> cadastro legacy alias, controlled by `BFF_ENABLE_LEGACY_CADASTRO_ROUTE`

## Source Layout

```txt
src/
  index.ts

  app/
    buildServer.ts
    routes.ts
    plugins/

  config/
    config.ts
    env.ts
    upstreams.ts

  modules/
    me/
    dashboard/
    acessos/
    auditoria/
    historico/
    autorizacao/permissoes/

  proxy/
    registerProxy.ts
    auditedProxy.ts
    proxyHeaders.ts
    proxyTarget.ts
    responseBody.ts
    runtimeAuth.ts

  shared/
    auth/
    audit/
    http/
```

There are no compatibility facades for the old root-level route, proxy, auth or
HTTP helper files. Import new code from the module, `shared/` or `proxy/` path
directly.

## Where Code Goes

Use `modules/` for domain or frontend-facing BFF features. A module should keep
HTTP registration in `*.routes.ts`, orchestration in `*.service.ts`, upstream
calls in `*.client.ts`, payload transformation in `*.mapper.ts` or
`*.presenter.ts`, and permission constants/rules in `*.permissions.ts`.

Use `shared/` only for code used by more than one module or proxy path:
authorization context, bearer-token handling, cache helpers, HTTP errors,
correlation id, header normalization and cross-cutting audit capture.

Use `proxy/` only for generic upstream proxy behavior: target resolution,
header forwarding, runtime auth, response buffering and audited proxy flow.
Do not put domain-specific BFF rules in `proxy/`.

## Adding A Route

1. Create or extend a module under `src/modules/{dominio}`.
2. Register only Fastify paths and HTTP translation in `*.routes.ts`.
3. Put use-case flow in `*.service.ts`.
4. Put upstream calls in `*.client.ts` when the route calls another service.
5. Put request/response mapping in `*.mapper.ts` or `*.presenter.ts`.
6. Reuse `shared/auth/permissionGuard.ts`, `shared/http/errors.ts` and related
   shared helpers instead of duplicating authorization or error handling.
7. Register the module from `src/app/routes.ts`.
8. Add or update focused tests under `src/**/*.test.ts`.
9. Run `npm run build` and `npm test`.

Public paths should remain in Portuguese, plural and kebab-case when applicable,
following `/api/v1/{resource}` or the existing BFF route family. Domain language
in public payloads and paths remains Portuguese.

## Commands

```bash
npm ci
npm run dev
npm run build
npm test
npm start
```

Default port: `5200`.

`npm test` runs source tests directly with `tsx`:

```bash
node --import tsx --test "src/**/*.test.ts"
```

This avoids stale compiled tests in `dist/` after files are moved.

## Environment

```bash
BFF_PORT=5200
BFF_HOST=0.0.0.0
BFF_BODY_LIMIT_BYTES=52428800
BFF_CORS_ALLOWED_ORIGINS=http://localhost:5173,https://mcad.tasso.dev.br
BFF_ENABLE_LEGACY_CADASTRO_ROUTE=true
CADASTRO_API_BASE_URL=http://localhost:5001/api/v1
IDENTIFICACAO_API_BASE_URL=http://localhost:5100/api/v1
ARRECADACAO_API_BASE_URL=http://localhost:5003/api/v1
DISTRIBUICAO_API_BASE_URL=http://localhost:5004/api/v1
AUDITORIA_API_BASE_URL=https://api-audit.tasso.dev.br/api/v1
AUTHZ_UPSTREAM_BASE_URL=https://mcad-authz.tasso.dev.br/v1
AI_ORCHESTRATOR_BASE_URL=http://localhost:5300/v1
AUTHZ_BASE_URL=http://localhost:8085
AUTHZ_TIMEOUT_MS=3000
ME_CACHE_TTL_SECONDS=60
```
