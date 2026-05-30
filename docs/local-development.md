# Desenvolvimento local/hibrido

Este projeto usa um modo local/hibrido por padrao:

- Logto: cloud/dev
- RabbitMQ: cloud/dev
- Redis: cloud/dev, normalmente por tras do `ecad-authz`
- Postgres: via tunel SSH para o servidor de desenvolvimento, ou direto/local se configurado
- APIs e frontends: locais somente quando escolhidos no `dev.sh`

## Pre-requisitos

- Node.js 20+
- .NET SDK 8
- JDK 21
- Maven 3.9+
- `ssh` com o alias `mcad-pg` configurado conforme `docs/ops/server-access-recovery.md`

Instale dependencias uma vez:

```bash
cd frontend && npm ci
cd ../services/bff && npm ci
cd ../ai-orchestrator && npm ci
cd ../identity-sync-api && npm ci
```

## Configuracao

Crie um arquivo local nao versionado:

```bash
cp .env.dev.example .env.local
```

Preencha apenas os segredos necessarios. O `dev.sh` carrega primeiro `.env` e depois
`.env.local`, entao `.env.local` pode sobrescrever qualquer valor.

### Banco via SSH

O modo padrao e:

```env
MCAD_DB_MODE=ssh-tunnel
MCAD_DB_SSH_HOST=mcad-server
MCAD_DB_REMOTE_HOST=shared-postgres
MCAD_DB_REMOTE_PORT=5432
MCAD_DB_LOCAL_PORT=
MCAD_DEV_DB_NAME=mcad
```

O alias `mcad-server` esperado esta documentado em `docs/ops/server-access-recovery.md`.
O `dev.sh` monta o `LocalForward` automaticamente. Se `MCAD_DB_LOCAL_PORT`
ficar vazio, o script escolhe a primeira porta livre entre `15432` e `15442`.

Tambem e possivel usar diretamente o alias `mcad-pg` do runbook:

```env
MCAD_DB_SSH_HOST=
MCAD_DB_SSH_ALIAS=mcad-pg
MCAD_DB_LOCAL_PORT=15432
```

Quando alguma API com banco sobe, o script inicia o tunel e aponta as variaveis
`*_DB_HOST` para `127.0.0.1:<porta-do-tunel>`.

Modos alternativos:

```env
MCAD_DB_MODE=direct
MCAD_DB_MODE=local-compose
```

## Comandos

Subir a stack app local:

```bash
./dev.sh up
```

Equivale a:

```bash
./dev.sh up app
```

Sobe:

- `cadastro-api` em `http://localhost:5001`
- `identificacao-api` em `http://localhost:5100`
- `arrecadacao-api` em `http://localhost:5003`
- `distribuicao-api` em `http://localhost:5004`
- `ai-orchestrator` em `http://localhost:5300`
- `bff` em `http://localhost:5200`
- `frontend` em `http://localhost:5173`

O frontend usa `FRONTEND_PORT=5173` e `FRONTEND_STRICT_PORT=true` por padrao.
Se a porta estiver ocupada, pare o processo existente ou defina outra porta em
`.env.local`. Nesse caso, a URL de callback tambem precisa estar liberada no Logto.

Subir tudo, incluindo `identity-sync-api`:

```bash
./dev.sh up all
```

Subir somente o frontend apontando para o BFF de desenvolvimento:

```bash
./dev.sh up frontend
```

Subir uma API isolada:

```bash
./dev.sh up cadastro-api
```

Subir API local + BFF local + frontend local:

```bash
./dev.sh up cadastro-api bff frontend
```

Nesse caso, o BFF aponta `cadastro-api` para `localhost:5001` e as demais APIs
para o servidor de desenvolvimento.

Parar tudo:

```bash
./dev.sh down
```

Parar servicos especificos:

```bash
./dev.sh down frontend bff cadastro-api
```

Ver status:

```bash
./dev.sh status
```

Ver logs:

```bash
./dev.sh logs
./dev.sh logs bff
```

## Como o modo hibrido funciona

O frontend Vite usa `/api` e o proxy e decidido por `VITE_BFF_PROXY_TARGET`:

- com `bff` local: `http://localhost:5200`
- sem `bff` local: `https://mcad-bff.tasso.dev.br`

O BFF local decide cada upstream conforme os servicos selecionados:

- servico selecionado no `dev.sh up`: `http://localhost:<porta>/api/v1`
- servico nao selecionado: URL `DEV_*` do ambiente de desenvolvimento

Exemplo:

```bash
./dev.sh up identificacao-api bff frontend
```

Resultado:

- frontend local chama BFF local
- BFF local chama `identificacao-api` local
- BFF local chama cadastro/arrecadacao/distribuicao no servidor de desenvolvimento

## Infra local opcional

`docker-compose.dev.yml` continua disponivel para dependencias locais, mas nao e o
padrao deste fluxo. Use quando quiser isolamento:

```bash
docker compose -f docker-compose.dev.yml up -d mcad-postgres mcad-rabbitmq mcad-minio
MCAD_DB_MODE=local-compose ./dev.sh up app
```

Para `ecad-authz` local, use o perfil documentado em `docs/migracao-authz/guia-operacional.md`.
