# Infisical Agent — mcad (runbook)

Materialização de segredos do **Infisical gerenciado** em **docker secrets** no Swarm.
Design completo: [`../../docs/ops/infisical-secrets-migration-design.md`](../../docs/ops/infisical-secrets-migration-design.md).

## Fatos do ambiente

| Item | Valor |
|---|---|
| Projeto | `mcad-platform` · id `299d00ce-55d3-4c39-87b4-faafcbc44965` · slug `mcad-platform-hx-dc` |
| Org | `fb2f2b7a-65c1-41e3-bc5e-893128fc1744` |
| Env alvo | `dev` (staging/prod no futuro) |
| Pastas | `/` (compartilhados), `/mecad`, `/authz`, `/auditoria`, `/storage`, `/observability`, `/iswc`, `/pg-backup` |
| Machine Identity do Agent | Universal Auth, **role read-only** (`viewer`). Creds em `.env`: `INFISICAL_RO_ID`, `INFISICAL_RO_SECRET` |

Estado em 2026-06-17:
- **Fase 0 ✅** — 34 segredos semeados em `dev`; MI read-only validada (login OK, leitura OK, escrita 403).
- **Fase 1 ✅** — stack `infisical-agent` rodando em dry-run (`APPLY=0`); 34 docker secrets versionados materializados (`label=mcad.infisical.managed=true`); nenhum serviço repointado.
- **Fase 2 ✅ (2026-06-28)** — entrypoints `_FILE` nos 6 serviços do mecad + authz; **postgres do mecad** via wrapper (`postgres-entrypoint.sh`); `docker-stack.yml` do **mecad** e do **authz** (`ecad-authz/infra/prod/`) fiados p/ `_FILE`+`secrets:` com indireção durável; mapa `CONSUMERS` preenchido (mecad + authz). Próximo: **cutover** (design §11/§11.1).

## Arquivos

| Arquivo | Papel |
|---|---|
| `agent-config.yaml` | Config do Agent: 1 template por pasta → `/render/<pasta>.env` + `execute` do materialize |
| `materialize-secrets.sh` | env file → docker secrets versionados (`<prefix>_<key>_<hash>`); dry-run por padrão; mapa `CONSUMERS` do mecad preenchido |
| `postgres-entrypoint.sh` | wrapper do entrypoint oficial do postgres: carrega senhas de role via `*_FILE` antes do init (`\getenv`); montar como config `mcad_postgres_entrypoint` |
| `Dockerfile` | `infisical/cli` + `docker-cli` + o script (a imagem oficial não traz docker CLI) |
| `infisical-agent-stack.yml` | Serviço Swarm (1 réplica no manager, monta `docker.sock`) |

## Deploy (Fase 1 — dry-run, sem impacto em prod)

```bash
# no host (ssh mcad-server), a partir do repo:
docker build -t mcad-infisical-agent:latest infra/infisical
docker config create infisical_agent_config infra/infisical/agent-config.yaml
printf '%s' "$INFISICAL_RO_ID"     | docker secret create infisical_ro_id -
printf '%s' "$INFISICAL_RO_SECRET" | docker secret create infisical_ro_secret -
docker stack deploy -c infra/infisical/infisical-agent-stack.yml infisical-agent

# validar: o Agent deve criar docker secrets com label mcad.infisical.managed=true
docker secret ls --filter label=mcad.infisical.managed=true
docker service logs infisical-agent_infisical-agent
```

Nesta fase `APPLY=0`: o script **cria** os docker secrets versionados e **loga** o que repointaria, **sem** alterar serviço algum.

## Cutover (Fase 3 — por stack)

1. Refatorar a stack para ler de `/run/secrets/*` (padrão `*_FILE`) — ver Fase 2 no design.
2. Preencher o mapa `CONSUMERS` em `materialize-secrets.sh` para os secrets daquela stack.
3. Redeploy com `INFISICAL_AGENT_APPLY=1` (e `INFISICAL_AGENT_PRUNE=1` para podar versões antigas).
4. Validar healthchecks; rollback via `docker service rollback <svc>`.

## Decisões em aberto (Fase 2)

- **Mapa `CONSUMERS`**: serviço↔secret de cada stack (vazio hoje; preencher por stack no cutover).
- **Leitura `*_FILE` por serviço**: Java/Postgres nativo; **.NET (cadastro/identificacao) precisa de `AddKeyPerFile("/run/secrets")`**; Node via shim no entrypoint.
- **Nomes prefixados por pasta** evitam colisão (ex.: raiz `postgres_password` vs `authz_postgres_password`); confirmar os nomes finais ao refatorar cada stack. ⚠️ Há prefixo redundante quando a chave já carrega o contexto (`storage_storage_mongodb_uri`, `pg-backup_pg_backup_postgres_password`) — decidir naming final (ex.: não prefixar chaves que já começam com o nome da pasta) junto do `target`/`CONSUMERS` na Fase 2.
- **Gap `/storage`** resolvido (mongo/r2 vindos do `.env`); revisar divergência de RabbitMQ (`mcad` vs `brhqehoy` do arrecadacao).

## Hardening (roadmap)

Acesso ao `docker.sock` concentra poder no Agent. Mitigar com nó manager dedicado + `docker-socket-proxy` restringindo a `secret create` / `service update`.
