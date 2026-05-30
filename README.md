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

### Provisionamento Logto

O provisionamento do Logto é restrito a autenticação/OIDC: aplicação SPA,
API Resource/audience e usuários de teste. Ele não cria roles de negócio, não
atribui roles a usuários e remove o customizer legado de claim `roles` do
access token, quando existir.

```bash
./scripts/provision-logto.sh
./scripts/provision-logto.sh --check-no-business-roles
```

Assignments DEV/CI ficam no `ecad-authz` e devem ser aplicados pela fixture
`seeds/mcad/assignments.json`:

```bash
./scripts/seed-authz.sh
```

### Migração controlada de roles Logto

O backfill de roles legadas do Logto para assignments oficiais do `ecad-authz`
usa somente APIs oficiais e gera relatório sem imprimir tokens, senhas ou
conteúdo sensível do `.env_qa`.

```bash
node scripts/migrate-logto-roles-to-authz-assignments.mjs --dry-run \
  --report tasks/plataforma/prd-authz-fonte-unica-assignments/migration-report.md

node scripts/migrate-logto-roles-to-authz-assignments.mjs --apply \
  --report tasks/plataforma/prd-authz-fonte-unica-assignments/migration-report.md
```

Variáveis necessárias: `LOGTO_MANAGEMENT_API` com `LOGTO_MANAGEMENT_TOKEN` ou
`LOGTO_M2M_CLIENT_ID`/`LOGTO_M2M_CLIENT_SECRET`, `AUTHZ_BASE_URL` e
`AUTHZ_ADMIN_TOKEN` para `--apply`.

## Copiloto Operacional

O Copiloto usa o BFF em `/api/ai/v1/*`, que encaminha para `services/ai-orchestrator`.

```bash
cd services/ai-orchestrator
npm install
OPENAI_API_KEY=<sua-chave> npm run dev
```

Variáveis principais: `AI_ORCHESTRATOR_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_STORAGE_URL`, `AI_TOOL_TIMEOUT_MS`.
