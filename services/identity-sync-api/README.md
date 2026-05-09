# identity-sync-api

Recebe webhooks do Logto e publica eventos internos de identidade no RabbitMQ.

## Endpoint

- `POST /webhooks/logto`
- Header obrigatório: `logto-signature-sha-256`
- Assinatura: HMAC SHA-256 hexadecimal do corpo bruto usando `LOGTO_WEBHOOK_SYNC_KEY`

## Eventos publicados

Exchange topic: `identity.events`

- `identity.user.upserted`
- `identity.user.suspended`
- `identity.user.deleted`

## Variáveis

- `IDENTITY_SYNC_PORT` ou `PORT` (default `5300`)
- `IDENTITY_SYNC_HOST` ou `HOST` (default `0.0.0.0`)
- `LOGTO_WEBHOOK_SYNC_KEY`
- `RABBITMQ_URL` ou `RABBITMQ_HOST`/`RABBITMQ_PORT`/`RABBITMQ_USER`/`RABBITMQ_PASSWORD`/`RABBITMQ_VHOST`
- `IDENTITY_EVENTS_EXCHANGE` (default `identity.events`)
