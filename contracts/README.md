# contracts/

Contratos de API de todos os serviços do mcad — fonte única para o portal de
documentação (EventCatalog) e para mock/contract-testing (Microcks).

```
contracts/
├── cadastro/        openapi.json   asyncapi.json   (.NET — Swashbuckle + Saunter)
├── identificacao/   openapi.json   asyncapi.json   (.NET — Swashbuckle + Saunter)
├── arrecadacao/     openapi.json   asyncapi.yaml   (Java — springdoc + handwritten)
└── distribuicao/    openapi.json   asyncapi.yaml   (Java — springdoc + handwritten)
```

## Natureza dos arquivos

- **`openapi.json`** (todos os 4) — **GERADO** a partir do código (springdoc nos Java,
  Swashbuckle nos .NET). Não editar à mão; regenerar com `scripts/export-contracts.sh`.
- **`asyncapi.json`** (cadastro, identificacao) — **GERADO** pelo Saunter (AsyncAPI 2.x).
- **`asyncapi.yaml`** (arrecadacao, distribuicao) — **HANDWRITTEN** (AsyncAPI 3.0), pois os
  serviços Java não têm gerador de AsyncAPI. Mantido manualmente a partir do código de
  eventos. O `export-contracts.sh` **não** toca nestes arquivos.

A fonte da verdade continua sendo o código; estes arquivos são o snapshot validado,
versionado para (a) alimentar os portais e (b) o CI detectar **drift**.

- **`examples.yaml`** (opcional, por serviço) — overlay de **exemplos** no formato Microcks
  `APIExamples`, importado como **artefato secundário** (mescla exemplos sobre o `openapi.json`
  sem sujar o spec gerado). É o que faz os **mocks do Microcks responderem com dados reais**.
  Escrito à mão; `metadata.name`/`version` devem casar com o serviço (ex.: `Arrecadacao API`/`v1`).
  O `scripts/import-contracts-microcks.sh` sobe automaticamente qualquer `contracts/*/examples.yaml`.

## Regenerar os contratos

`scripts/export-contracts.sh` faz curl dos endpoints dos serviços **rodando localmente** e
materializa os arquivos. Modo `--check` falha se o commitado divergir do gerado (CI).

```bash
scripts/export-contracts.sh          # atualiza os arquivos
scripts/export-contracts.sh --check  # só verifica drift (não escreve)
```

### Pré-requisito: subir os 4 serviços contra a infra LOCAL

> ⚠️ O `.env` aponta o RabbitMQ para um broker de **produção** (CloudAMQP). Vários serviços
> publicam eventos no startup (ex.: seed do arrecadacao, outbox pollers). **Sempre** force o
> RabbitMQ para o broker local ao gerar contratos, senão eventos vazam para produção.

1. Infra local (Postgres + RabbitMQ):

   ```bash
   docker compose -f docker-compose.dev.yml up -d mcad-postgres mcad-rabbitmq
   ```

2. Suba cada serviço com env explícito e seguro (DB via superusuário `gestauto`, pois os
   roles `*_svc` só são criados se as senhas vierem por env; RabbitMQ local; Logto real para
   OIDC discovery; authz sem registro no startup).

   **arrecadacao (:5003)** — `cd services/arrecadacao-api`:
   ```bash
   ARRECADACAO_DB_HOST=localhost ARRECADACAO_DB_PORT=5432 ARRECADACAO_DB_NAME=mcad \
   ARRECADACAO_DB_USER=gestauto ARRECADACAO_DB_PASSWORD=gestauto123 ARRECADACAO_DB_SSL_MODE=disable \
   RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=mcad RABBITMQ_PASSWORD=mcad RABBITMQ_VHOST=mcad \
   OIDC_AUTHORITY=https://9lcinu.logto.app/oidc \
   AUTHZ_CATALOG_REGISTRATION_REQUIRED=false AUTHZ_BASE_URL=http://localhost:8085 OTEL_SDK_DISABLED=true \
   mvn -q -pl arrecadacao-api -am install -DskipTests && \
   mvn -q -pl arrecadacao-api spring-boot:run
   ```

   **distribuicao (:5004)** — `cd services/distribuicao-api`:
   ```bash
   DB_HOST=localhost DB_PORT=5432 DB_NAME=mcad DB_SCHEMA_DISTRIBUICAO=distribuicao \
   DB_USER_DISTRIBUICAO=gestauto DB_PASSWORD_DISTRIBUICAO=gestauto123 \
   RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=mcad RABBITMQ_PASSWORD=mcad RABBITMQ_VHOST=mcad \
   OIDC_AUTHORITY=https://9lcinu.logto.app/oidc \
   ECAD_AUTHZ_REGISTER_ON_STARTUP=false ECAD_AUTHZ_BASE_URL=http://localhost:8081 OTEL_SDK_DISABLED=true \
   mvn -q -pl distribuicao-api -am install -DskipTests && \
   mvn -q -pl distribuicao-api spring-boot:run
   ```

   **cadastro (:5001)** — `cd services/cadastro-api/1-Services/Cadastro.API`:
   ```bash
   CADASTRO_DB_HOST=localhost CADASTRO_DB_PORT=5432 CADASTRO_DB_NAME=mcad CADASTRO_DB_SCHEMA=cadastro \
   CADASTRO_DB_USER=gestauto CADASTRO_DB_PASSWORD=gestauto123 CADASTRO_DB_SSL_MODE=Disable \
   RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=mcad RABBITMQ_PASSWORD=mcad RABBITMQ_VHOST=mcad \
   OIDC_AUTHORITY=https://9lcinu.logto.app/oidc \
   ASPNETCORE_ENVIRONMENT=Development AUTH_ENABLED=false Authz__Enabled=false \
   PORTAL_JWT_SECRET=dev-only-portal-secret-for-spec-generation-0123456789 \
   dotnet run --launch-profile http
   ```

   **identificacao (:5100)** — `cd services/identificacao-api/1-Services/Identificacao.API`:
   ```bash
   IDENTIFICACAO_DB_HOST=localhost IDENTIFICACAO_DB_PORT=5432 IDENTIFICACAO_DB_NAME=mcad IDENTIFICACAO_DB_SCHEMA=identificacao \
   IDENTIFICACAO_DB_USER=gestauto IDENTIFICACAO_DB_PASSWORD=gestauto123 IDENTIFICACAO_DB_SSL_MODE=Disable \
   RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=mcad RABBITMQ_PASSWORD=mcad RABBITMQ_VHOST=mcad \
   OIDC_AUTHORITY=https://9lcinu.logto.app/oidc \
   ASPNETCORE_ENVIRONMENT=Development AUTH_ENABLED=false Authz__Enabled=false \
   dotnet run --launch-profile http
   ```

3. Com os 4 de pé: `scripts/export-contracts.sh`.

## Endpoints servidos em runtime

| Serviço | OpenAPI | AsyncAPI |
|---|---|---|
| cadastro :5001 | `/swagger/v1/swagger.json` | `/asyncapi/asyncapi.json` |
| identificacao :5100 | `/swagger/v1/swagger.json` | `/asyncapi/asyncapi.json` |
| arrecadacao :5003 | `/v3/api-docs` | — (handwritten) |
| distribuicao :5004 | `/v3/api-docs` | — (handwritten) |
