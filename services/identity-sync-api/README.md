# identity-sync-api

Sincroniza periodicamente identidade e status dos usuários do Logto para o
`ecad-authz` via RabbitMQ.

Faz polling na Management API do Logto a cada N minutos, monta um snapshot
por usuário sem papéis de negócio e publica eventos no exchange
`identity.events`. O `ecad-authz` consome a fila `authz.identity.users` e faz
upsert na tabela `users` (idempotente por `idp_subject` = `logtoUserId`).
Assignments de papéis pertencem ao `ecad-authz` e devem ser criados/removidos
por seus endpoints oficiais, normalmente via BFF.

## Endpoints

- `GET /health/live` — liveness.
- `GET /health/ready` — verifica conexão com RabbitMQ.
- `GET /sync/status` — último resultado do scheduler (`startedAt`, `durationMs`, `fetched`, `published`, `error`).
- `POST /sync/logto/users` — dispara um sync imediato (manual).
  - Header obrigatório: `x-sync-admin-token: $IDENTITY_SYNC_ADMIN_TOKEN`.
  - Quando o scheduler está habilitado, esta chamada compartilha o mesmo mutex,
    evitando execuções concorrentes.

## Eventos publicados

Exchange topic: `identity.events`

- `identity.user.upserted`
- `identity.user.suspended`
- `identity.user.deleted`

> O sync atual só produz `upserted` (com `isSuspended: true|false`). Detecção de
> deleção por diff entre Logto e a tabela local não está implementada — usuários
> removidos do Logto continuarão existindo no `ecad-authz` até receberem
> tratamento manual ou um evento `User.Deleted` por outra via.

Snapshot de usuário publicado:

```json
{
  "logtoUserId": "logto-user-1",
  "username": "analista_arrecadacao",
  "displayName": "Analista Arrecadacao",
  "email": "analista_arrecadacao@mcad.dev",
  "avatarUrl": null,
  "isSuspended": false,
  "raw": {
    "id": "logto-user-1",
    "username": "analista_arrecadacao",
    "name": "Analista Arrecadacao",
    "primaryEmail": "analista_arrecadacao@mcad.dev",
    "isSuspended": false
  }
}
```

O payload não publica `roles` nem `roleKeys`. Se payloads legados ou mocks ainda
incluírem esses campos, eles são removidos do evento e contabilizados na métrica
`identity_sync_roles_ignored_total`, sem registrar os valores dos papéis.

## Variáveis de ambiente

Obrigatórias:

- `LOGTO_M2M_CLIENT_ID`
- `LOGTO_M2M_CLIENT_SECRET`
- `LOGTO_MANAGEMENT_API`

Recomendadas:

- `IDENTITY_SYNC_ADMIN_TOKEN` — protege o `POST /sync/logto/users`.
- `RABBITMQ_URL` (ou `RABBITMQ_HOST`/`RABBITMQ_PORT`/`RABBITMQ_USER`/`RABBITMQ_PASSWORD`/`RABBITMQ_VHOST`).

Opcionais:

- `IDENTITY_SYNC_PORT` ou `PORT` (default `5300`).
- `IDENTITY_SYNC_HOST` ou `HOST` (default `0.0.0.0`).
- `IDENTITY_EVENTS_EXCHANGE` (default `identity.events`).
- `IDENTITY_SYNC_SCHEDULER_ENABLED` (default `true`).
- `IDENTITY_SYNC_INTERVAL_MS` (default `300000` — 5 minutos).
- `IDENTITY_SYNC_ON_STARTUP` (default `true`).
- `LOGTO_PAGE_SIZE` (default `100`, máximo `100`).
- `REQUEST_BODY_LIMIT_BYTES` (default `1048576`).

## Operação

### Bootstrap inicial

```bash
curl -X POST "https://mcad-identity-sync.tasso.dev.br/sync/logto/users" \
  -H "x-sync-admin-token: ${IDENTITY_SYNC_ADMIN_TOKEN}"
```

Resposta:

```json
{ "received": true, "published": 8, "fetched": 8, "skipped": 0, "durationMs": 421 }
```

### Inspeção

```bash
curl https://mcad-identity-sync.tasso.dev.br/sync/status
```

Resposta:

```json
{
  "schedulerEnabled": true,
  "intervalMs": 300000,
  "lastRun": {
    "startedAt": "2026-05-19T03:00:00.000Z",
    "finishedAt": "2026-05-19T03:00:00.421Z",
    "durationMs": 421,
    "fetched": 8,
    "published": 8,
    "skipped": 0,
    "error": null
  }
}
```

### Pré-requisitos no `ecad-authz`

Consumer ativo da fila `authz.identity.users`, bindada no exchange
`identity.events` com routing key `identity.user.*`.

Variáveis: `IDENTITY_EVENTS_EXCHANGE=identity.events`,
`IDENTITY_EVENTS_QUEUE=authz.identity.users`,
`IDENTITY_EVENTS_ROUTING_KEY=identity.user.*`.

## Notas

- A Management API do Logto tem rate limit. O sync usa paginação em
  `GET /api/users` e não chama `GET /users/{id}/roles`.
- Webhook do Logto **não é mais consumido** — sincronização passou a ser por
  polling de identidade/status, sem fetch adicional de roles.
- `LOGTO_PAGE_SIZE` controla o tamanho de página do `GET /api/users` (máx. 100,
  limite da Management API).
