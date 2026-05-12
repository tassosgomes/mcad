# identity-sync-api

Recebe webhooks do Logto e publica eventos internos de identidade no RabbitMQ.

## Endpoint

- `POST /webhooks/logto`
- Header obrigatório: `logto-signature-sha-256`
- Assinatura: HMAC SHA-256 hexadecimal do corpo bruto usando `LOGTO_WEBHOOK_SYNC_KEY`
- `POST /sync/logto/users`
- Header obrigatório: `x-sync-admin-token`
- Uso operacional para backfill dos usuários já existentes no Logto

## Eventos publicados

Exchange topic: `identity.events`

- `identity.user.upserted`
- `identity.user.suspended`
- `identity.user.deleted`

## Backfill de usuários do Logto

O backfill publica eventos `identity.user.upserted` para usuários que já existem no Logto. Ele deve ser executado depois do deploy da `identity-sync-api` e do `ecad-authz` com o consumer de eventos habilitado.

Fluxo:

1. A `identity-sync-api` busca os usuários atuais na Logto Management API.
2. Para cada usuário, busca as roles atribuídas no Logto.
3. Publica um evento `identity.user.upserted` no exchange `identity.events`.
4. O `ecad-authz` consome o evento pela fila `authz.identity.users`.
5. O `ecad-authz` cria ou atualiza a linha local em `users`, usando `logtoUserId` como `idp_subject`.

Comando:

```bash
curl -X POST "https://mcad-identity-sync.tasso.dev.br/sync/logto/users" \
  -H "x-sync-admin-token: ${IDENTITY_SYNC_ADMIN_TOKEN}"
```

Resposta esperada:

```json
{
  "received": true,
  "published": 8
}
```

Pré-requisitos:

- `IDENTITY_SYNC_ADMIN_TOKEN` configurado na `identity-sync-api`.
- `LOGTO_M2M_CLIENT_ID`, `LOGTO_M2M_CLIENT_SECRET` e `LOGTO_MANAGEMENT_API` configurados na `identity-sync-api`.
- RabbitMQ acessível pela `identity-sync-api` e pelo `ecad-authz`.
- `ecad-authz` consumindo `IDENTITY_EVENTS_EXCHANGE=identity.events`, `IDENTITY_EVENTS_QUEUE=authz.identity.users` e `IDENTITY_EVENTS_ROUTING_KEY=identity.user.*`.

O endpoint é idempotente do ponto de vista operacional: publicar o backfill mais de uma vez não deve duplicar usuários no `ecad-authz`, porque o upsert usa `idp_subject` único. As atribuições de papel também são ignoradas quando já existe uma atribuição ativa equivalente.

Use o backfill quando:

- a integração de eventos foi ativada depois dos usuários já terem sido criados no Logto;
- uma fila foi recriada e eventos antigos foram perdidos;
- for necessário reconciliar o `ecad-authz` com o estado atual do Logto.

## Variáveis

- `IDENTITY_SYNC_PORT` ou `PORT` (default `5300`)
- `IDENTITY_SYNC_HOST` ou `HOST` (default `0.0.0.0`)
- `LOGTO_WEBHOOK_SYNC_KEY`
- `IDENTITY_SYNC_ADMIN_TOKEN`
- `LOGTO_M2M_CLIENT_ID`
- `LOGTO_M2M_CLIENT_SECRET`
- `LOGTO_MANAGEMENT_API`
- `RABBITMQ_URL` ou `RABBITMQ_HOST`/`RABBITMQ_PORT`/`RABBITMQ_USER`/`RABBITMQ_PASSWORD`/`RABBITMQ_VHOST`
- `IDENTITY_EVENTS_EXCHANGE` (default `identity.events`)
