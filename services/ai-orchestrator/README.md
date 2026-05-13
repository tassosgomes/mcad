# MCAD AI Orchestrator

Node.js/TypeScript service that hosts the MCAD operational Copilot runtime with Mastra tools and workflows.

## Local

```bash
npm install
npm run dev
```

Default port: `5300`.

## Routes

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /v1/audit-events`
- `POST /v1/chat`
- `POST /v1/workflows/:workflowId/runs`
- `POST /v1/workflows/:workflowId/runs/:runId/resume`

## Environment

```bash
AI_HOST=0.0.0.0
AI_PORT=5300
AI_ENVIRONMENT=local
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_STORAGE_URL=
AI_TOOL_TIMEOUT_MS=10000
AI_MAX_MESSAGE_CHARS=4000
AI_TRACE_PROMPTS=false

CADASTRO_API_BASE_URL=http://localhost:5001/api/v1
IDENTIFICACAO_API_BASE_URL=http://localhost:5100/api/v1
ARRECADACAO_API_BASE_URL=http://localhost:5003/api/v1
DISTRIBUICAO_API_BASE_URL=http://localhost:5004/api/v1
AUDITORIA_API_BASE_URL=https://api-audit.tasso.dev.br/api/v1
AUTHZ_UPSTREAM_BASE_URL=https://mcad-authz.tasso.dev.br/v1
```

Do not put real secrets in committed env files. In tests, `OPENAI_API_KEY=test-key` enables deterministic local responses.
