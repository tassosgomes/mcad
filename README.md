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