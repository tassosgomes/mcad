# Microcks — portal de contratos + mocks (Fase 2)

Microcks serve como **portal de documentação** (navega os OpenAPI + AsyncAPI de
`contracts/`) e, na Fase 2b, como **mock + contract testing**. Apache-2.0, self-host.

## Protótipo local (Fase 2a)

`docker-compose.yml` sobe o core (mongo + keycloak + postman + app), com **Keycloak
desabilitado** (upload aberto) para validação rápida.

```bash
docker compose -f infra/microcks/docker-compose.yml up -d
# UI:  http://localhost:18081
MICROCKS_URL=http://localhost:18081 scripts/import-contracts-microcks.sh   # importa os 8 contratos
```

## Deploy no Swarm (`microcks-stack.yml`, raiz do repo)

Host único `MICROCKS_HOST` (Microcks na raiz, Keycloak em `/auth`), TLS via
`cloudflare-resolver`, ingress por `traefik-public`. Keycloak **habilitado** (SSO).

1. **DNS**: cadastrar `MICROCKS_HOST` (ex.: `mcad-docs.tasso.dev.br`) no Cloudflare,
   apontando para o nó do Swarm (igual aos demais `mcad-*.tasso.dev.br`).
2. **Env**: `cp infra/microcks/.env.microcks.example infra/microcks/.env.microcks` e preencha
   (host, senhas do Keycloak, `MICROCKS_AUTOMATION_SECRET`). Esse arquivo é **gitignored**.
3. **Realm**: `infra/microcks/render-realm.sh` → gera
   `infra/microcks/keycloak-realm/microcks-realm-prod.json` (gitignored, com os secrets).
   O `microcks-stack.yml` publica esse arquivo como **Swarm config** `microcks_realm`.
4. **Deploy** (Portainer): subir `microcks-stack.yml` com o env-file
   `infra/microcks/.env.microcks`. O nó precisa ter o realm renderizado no caminho da config.
5. **Importar contratos**:
   ```bash
   MICROCKS_URL=https://$MICROCKS_HOST scripts/import-contracts-microcks.sh
   # usa client_credentials do client 'microcks-automation' (secret do .env.microcks)
   ```

### Login do portal
- Usuário do realm `microcks`: `admin` / `KEYCLOAK_ADMIN_PASSWORD` (do `.env.microcks`).
- Console do Keycloak (master): `KEYCLOAK_BOOTSTRAP_ADMIN` / `KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`,
  em `https://$MICROCKS_HOST/auth`.

### Validado
- Realm de prod importa no Keycloak 26 sem erro; o client `microcks-automation`
  (client_credentials) recebe token com `resource_access.microcks-app: [manager]` — ok p/ upload.
- Os 8 contratos importam e geram 4 serviços REST + 4 EVENT no Microcks.

## Caveats
- **Mocks vazios sem exemplos**: os specs gerados (springdoc/Swashbuckle/Saunter) têm poucos
  exemplos; o Microcks documenta as operações mas os mocks retornam vazio até semearmos
  exemplos (`@Schema(example=…)` no código ou artefatos de exemplo/Postman no Microcks).
- **Async (Fase 2b)**: requer async-minion + bus interno (Kafka) + binding AMQP para o
  RabbitMQ do mcad. Binding AMQP do Microcks ignora headers — ok, pois os eventos são
  CloudEvents *structured* (tudo no corpo). Ver bloco comentado em `microcks-stack.yml`.
