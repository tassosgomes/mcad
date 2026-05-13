# mcad

## Keycloak

Provisionamento automatizado do realm de autenticação:

```bash
./scripts/provision-keycloak.sh
```

O script lê as credenciais administrativas de [/.env](/home/tsgomes/mcad/.env) e garante de forma idempotente:

- realm `mcad`
- client público `mcad-frontend` com PKCE S256
- roles `analista-cadastro` e `consultor`
- usuários de teste `analista.teste` e `consultor.teste`

## Copiloto Operacional

O Copiloto usa o BFF em `/api/ai/v1/*`, que encaminha para `services/ai-orchestrator`.

```bash
cd services/ai-orchestrator
npm install
OPENAI_API_KEY=<sua-chave> npm run dev
```

Variáveis principais: `AI_ORCHESTRATOR_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_STORAGE_URL`, `AI_TOOL_TIMEOUT_MS`.
