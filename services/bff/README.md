# MCAD BFF

Node.js proxy BFF for the MCAD frontend.

## Routes

- `GET /health/live`
- `GET /health/ready`
- `GET /api/me` -> consulta `AUTHZ_BASE_URL/v1/me/authorization-context` repassando o Bearer e retorna `{ subjectId, name, email }`
- `GET /api/me/permissions` -> mesma origem, retorna `{ subjectId, permissions, version }` e propaga `X-Authz-Version`
- `/api/cadastro/v1/*` -> `CADASTRO_API_BASE_URL`
- `/api/identificacao/v1/*` -> `IDENTIFICACAO_API_BASE_URL`
- `/api/arrecadacao/v1/*` -> `ARRECADACAO_API_BASE_URL`
- `/api/distribuicao/v1/*` -> `DISTRIBUICAO_API_BASE_URL`
- `/api/auditoria/v1/*` -> `AUDITORIA_API_BASE_URL`
- `/api/authz/v1/*` -> `AUTHZ_UPSTREAM_BASE_URL`
- `/api/ai/v1/*` -> `AI_ORCHESTRATOR_BASE_URL`
- `/v1/*` -> `AUTHZ_UPSTREAM_BASE_URL` legacy alias
- `/api/v1/*` -> cadastro legacy alias, controlled by `BFF_ENABLE_LEGACY_CADASTRO_ROUTE`

## Local

```bash
npm install
npm run dev
```

Default port: `5200`.

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
