# mcad

## Autenticação e autorização

O MCAD separa autenticação e autorização:

- autenticação via IdP OIDC/OAuth2 (Logto em produção; Keycloak segue compatível para dev/local);
- autorização fina via `ecad-authz`;
- frontend consulta permissões efetivas pelo BFF (`/api/me` e `/api/me/permissions`) apenas para UX;
- APIs validam JWT Bearer e exigem permissões no formato `dominio:area:recurso:acao`.

Documentação principal:

- [Plano atual de autenticação/autorização](docs/architecture/auth-plan.md)
- [Guia operacional da migração AuthZ](docs/migracao-authz/guia-operacional.md)
- [ADRs de autenticação/autorização](docs/adr/README.md)

Variáveis principais:

```env
OIDC_AUTHORITY=https://9lcinu.logto.app/oidc
OIDC_AUDIENCE=https://api.mcad.local
AUTH_ENABLED=true
AUTHZ_BASE_URL=http://localhost:8085
AUTHZ_TIMEOUT_MS=3000
AUTHZ_CACHE_TTL_SECONDS=60
```

## Copiloto Operacional

O Copiloto usa o BFF em `/api/ai/v1/*`, que encaminha para `services/ai-orchestrator`.

```bash
cd services/ai-orchestrator
npm install
OPENAI_API_KEY=<sua-chave> npm run dev
```

Variáveis principais: `AI_ORCHESTRATOR_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_STORAGE_URL`, `AI_TOOL_TIMEOUT_MS`.
