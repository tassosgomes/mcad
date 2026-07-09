# Migração de Segredos para Infisical Gerenciado — Documento de Design

> Status: **Em execução** — Fases 0, 1 e 2 concluídas; **Fase 3 concluída para stacks principais; Fase 4 concluída para `mecad`/`mcad-data`/`mcad-authz`/`storage`/`observability`/`iswc`/`pg-backup`** · Autor: devsecops · Criado 2026-06-16 · Atualizado 2026-06-28
> Decisões fixadas: injeção via **Infisical Agent → docker secrets**; escopo **todas as stacks**; Agent como **serviço Swarm com `/var/run/docker.sock`**.
> Ambiente alvo agora: **`dev` (e `staging`)**; **`prod` fica para o futuro**.
> Projeto Infisical já criado: `mcad-platform` (id `299d00ce-55d3-4c39-87b4-faafcbc44965`, slug `mcad-platform-hx-dc`), envs `dev`/`staging`/`prod`. Estrutura **multipastas** confirmada. Acesso via `INFISICAL_TOKEN` (Bearer JWT) no `.env`.
>
> **Nota sobre "rotação":** o versionamento de secret por hash + `service update --secret-add/--secret-rm` é apenas a mecânica de **cutover** (virar do valor atual para o gerido pelo Infisical) e de troca quando o valor é editado manualmente. **Não é rotação automática** — rotação por TTL / dynamic secrets é item de futuro.

## 0. Onde estamos (2026-06-28)

| Fase | Estado | Resumo |
|---|---|---|
| 0 — Setup Infisical | ✅ **Concluída** | Projeto `mcad-platform` + 7 pastas (env `dev`); **34 segredos** semeados; Machine Identity read-only (`INFISICAL_RO_ID/SECRET` no `.env`) validada. |
| 1 — Agent em dry-run | ✅ **Concluída** | Stack `infisical-agent` rodando no `mcad-server` (1 réplica manager); materializa os **34 docker secrets** versionados (`label=mcad.infisical.managed=true`) **sem repointar serviços** (`APPLY=0`). |
| 2 — Refactor `*_FILE` | ✅ **Concluída** (2026-06-28) | Entrypoints `_FILE` nos serviços; **Dockerfiles .NET/Java agora cabeiam o entrypoint** (gap corrigido — ver §12); cobertura de segredos fechada; `materialize-secrets.sh` `CONSUMERS` preenchido. ⚠️ A fiação de stack YAML foi feita contra o repo, mas o cutover usa os composes **deployados no Portainer** (topologia `shared-postgres`, ≠ repo) — ver §12. |
| 3 — Cutover | ✅ **Concluída para stacks principais** (2026-06-28) | `mecad`, `mcad-data` e `mcad-authz` estão em `_FILE`/docker secrets no VPS 30. `frontend` e `bff` ficaram em `:131` sem migração de segredo. Detalhes em §12. |
| 4 — Limpeza | 🔄 **Quase concluída** (2026-06-28) | Env plaintext redundante removido do Portainer para stacks principais + `storage-service`, `mcad-observability`, `mcad-iswc`, `pg-backup`; secrets estáticos órfãos podados; `vault` removido. Resíduo: `ECAD_AUTHZ_REDIS_URL` ainda plaintext por depender de cutover próprio. |

**Feito na Fase 2:** cada serviço do `mecad` ganhou `services/<svc>/docker/entrypoint.sh` (padrão `load_secret_file VAR` espelhando o `audit-service`) + ajuste no Dockerfile (`COPY`+`chmod`+`ENTRYPOINT`). Sem mudança de código de app. Decisão de RabbitMQ: **só a senha é segredo** (URL composta em runtime; `identificacao` compõe `RABBITMQ_URL` no entrypoint pois publisher/consumers só leem a URL).

**Segredos em `dev` por pasta:** `/`=6 · `/mecad`=15 (4 DB + webhook + identity-sync token + portal jwt + 8 storage-logto por domínio) · `/authz`=4 · `/auditoria`=2 · `/storage`=4 · `/observability`=1 · `/iswc`=1 · `/pg-backup`=1.

**Pendências que precisam de decisão/valor:** ver §10.

### Atualização 2026-06-27 — `auditoria` como 1ª stack em cutover (VPS 30)

Após a migração de servidor (`infisical-secrets` no VPS 30 / `5.189.160.137`), o stack `audit-example` subia com `ORA-01017` porque o Oracle (`gvenzl/oracle-free`, volume novo vazio) bootstrapou o `AUDIT_APP` com os **placeholders `change-me-*`** do `.env.example`, enquanto o serviço autenticava com o docker secret. Aproveitou-se para **rotacionar e cutover p/ o Infisical**:

1. **Rotação no Infisical (via API, env `dev`, `/auditoria`):** `AUDIT_DB_PASSWORD` e `ORACLE_SYS_PASSWORD` trocados por senhas fortes (32 chars alfanuméricos). O agent re-renderizou e o `materialize-secrets.sh` criou `auditoria_audit_db_password_e28b7b0a` e `auditoria_oracle_sys_password_71e00622`.
2. **Oracle alinhado às novas senhas:** `ALTER USER SYS`/`SYSTEM` (`CONTAINER=ALL`, no CDB `FREE` as sysdba) + `ALTER USER AUDIT_APP` (no PDB `FREEPDB1`), lendo os valores **dos secrets materializados** (nunca expostos em claro). Gotcha: `SET DEFINE OFF` no sqlplus (`&` vira variável de substituição).
3. **Repoint do serviço (cutover):** `docker service update --secret-rm audit_db_password --secret-add source=auditoria_audit_db_password_e28b7b0a,target=audit_db_password audit-example_audit-service`. Serviço `1/1` healthy, Flyway aplicou `V1`.

**Aprendizados desta 1ª stack (aplicar às próximas):**
- **gvenzl/Oracle não tem `_FILE`** para `APP_USER_PASSWORD`/`ORACLE_PASSWORD`: a senha de **bootstrap** precisa ficar em **env literal** e **espelhar** o secret do Infisical. Só é lida no 1º bootstrap de volume vazio (inerte depois), mas um recreate de volume reintroduz o problema se o env divergir.
- **PDB `FREEPDB1` exige `SAVE STATE`** senão volta MOUNTED (não OPEN) após restart → `ORA-01109`. Aplicado.
- **Repoint imperativo dribla a definição da stack:** como o cutover foi via `service update` (não redeploy), a YAML no Portainer ainda resolve o estático por default. Usar a indireção já existente `name: ${AUDIT_DB_PASSWORD_SECRET:-audit_db_password}` setando `AUDIT_DB_PASSWORD_SECRET=<secret_versionado>` no env do Portainer torna o cutover **durável** (senão um Update da stack reverte).

**Follow-ups `auditoria` (Fase 4):** setar `AUDIT_DB_PASSWORD_SECRET` no Portainer + corrigir env de bootstrap (`AUDIT_DB_PASSWORD`/`ORACLE_SYS_PASSWORD`) p/ os valores reais; remover o estático `audit_db_password`; podar `auditoria_*_45ae8a30`/`_b2c5985d`. Opcional: preencher o mapa `CONSUMERS` do `materialize-secrets.sh` p/ `auditoria` (rotação futura automática via `APPLY=1`).

### Atualização 2026-06-27 (tarde) — `auditoria` Fases 4 e 5 concluídas (VPS 30)

Verificação via API do Portainer revelou que o cutover **não estava durável**: o env de bootstrap (`AUDIT_DB_PASSWORD`/`ORACLE_SYS_PASSWORD`) já tinha valores fortes reais (sem `change-me`, hashes batendo `e28b7b0a`/`71e00622`), mas a indireção do secret estava **no lugar errado** — alguém colou `AUDIT_DB_PASSWORD_SECRET: auditoria_audit_db_password_e28b7b0a` dentro do bloco `environment:` do serviço `oracle` na YAML (inerte: vira env var no container, **não** alimenta a interpolação `name: ${AUDIT_DB_PASSWORD_SECRET:-audit_db_password}` da seção `secrets:`, que lê do env **da stack**). O env **da stack** no Portainer continuava `audit_db_password` → um *Update* da stack reverteria o cutover (ORA-01017). O serviço só rodava certo por causa do `service update` imperativo anterior.

**Fase 4 (durabilidade) — feita via `PUT /api/stacks/6`:**
1. Env da stack `AUDIT_DB_PASSWORD_SECRET` corrigido `audit_db_password` → `auditoria_audit_db_password_e28b7b0a`.
2. Removida a linha redundante `AUDIT_DB_PASSWORD_SECRET:` do `environment:` do `oracle` na YAML. (Isso muda o spec do `oracle` → **recreate do container**; com `SAVE STATE` já aplicado, `FREEPDB1` reabriu sozinho como `READ WRITE` e re-registrou no listener.) `audit-service` não mudou (já resolvia `e28b7b0a`).

Convergência observada: `oracle` 1/1 e `audit-service` 1/1 `healthy`; janela de `ORA-12514`/`ORA-17008` (~40s, pool churn durante o restart do Oracle) e depois 0 erros — comportamento transitório esperado.

**Fase 5 (limpeza) — feita após confirmar 0 referências em qualquer serviço:** `docker secret rm audit_db_password auditoria_audit_db_password_45ae8a30 auditoria_oracle_sys_password_b2c5985d`. Restam só `auditoria_audit_db_password_e28b7b0a` (montado pelo `audit-service`) e `auditoria_oracle_sys_password_71e00622` (sys pw atual; não consumido como secret — Oracle não tem `_FILE`).

**Aprendizado p/ próximas stacks:** a indireção `${X_SECRET}` só funciona se setada no **env da stack** (Portainer Env array), não no `environment:` de um serviço. Sempre validar via `PUT`-then-redeploy (ou `GET /api/stacks/{id}` Env) que o cutover é durável, não só via `service inspect` do runtime.

## 1. Objetivo

Centralizar todos os segredos das stacks do mcad no **Infisical gerenciado** (cloud) como fonte única da verdade, eliminando segredos em texto plano no `spec` dos serviços Swarm e no `.env_linux`. O Infisical Agent materializa os segredos como **docker secrets** versionados; os serviços passam a lê-los via padrão `*_FILE` em `/run/secrets/`.

## 2. Estado atual (levantamento)

Servidor: `ssh mcad-server` — Swarm single-node (leader = `vmi3283566`), gerenciado por **Portainer** (`PUT /api/stacks/{id}`). Coexistem dois mecanismos:

### Mecanismo A — env em texto plano (a corrigir) ❌
Segredos interpolados (`${VAR:?}`) no `docker-stack.yml` → injetados como env vars da stack no Portainer (origem: `.env_linux` na máquina dev) → acabam **legíveis em texto plano** via `docker service inspect`. Confirmado em `mecad_mcad-cadastro-api` (`CADASTRO_DB_PASSWORD`, `RABBITMQ_PASSWORD`, `RABBITMQ_URL`, `STORAGE_LOGTO_CLIENT_SECRET`). Nenhum serviço do stack `mecad` monta docker secret.

| Stack | Segredos hoje em env plano |
|---|---|
| `mecad` (app, 7 serviços) | `POSTGRES_PASSWORD`, `CADASTRO_DB_PASSWORD`, `IDENTIFICACAO_DB_PASSWORD`, `ARRECADACAO_DB_PASSWORD`, `DB_PASSWORD_DISTRIBUICAO`, `RABBITMQ_PASSWORD`/`RABBITMQ_URL`, `STORAGE_LOGTO_CLIENT_SECRET`, `LOGTO_WEBHOOK_SYNC_KEY` |
| `mcad-authz` | `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `ECAD_AUTHZ_REDIS_PASSWORD`, `LOGTO_M2M_CLIENT_SECRET` |
| `mcad-iswc` | `DB_ADMIN_PASSWORD_ISWC` |
| `pg-backup` | `PG_BACKUP_POSTGRES_PASSWORD`, credenciais S3 |

### Mecanismo B — docker secrets reais (padrão a generalizar) ✅
| Stack / serviço | Docker secrets |
|---|---|
| `audit-example` (auditoria) | `audit_db_password`, `rabbitmq_password` via `AUDIT_DB_PASSWORD_FILE`, `RABBITMQ_PASSWORD_FILE`; já tem indireção `${*_SECRET}` p/ versionamento |
| `storage-service` | `storage_mongodb_uri`, `storage_s3_access_key_id`, `storage_s3_secret_access_key` |
| `mcad-observability` | `grafana-token` (+ 6 versões órfãs: `mcad_observability_grafana_token` v2–v5, `token-grafana`) |

### Outras observações
- `.env_linux` é o "secret store" de fato; contém ainda `PORTAINER_USER/PASS` e `LINUX_PASS` (SSH).
- `.env_qa` (mcad) = notas com senhas de ~17 usuários Logto de teste em texto plano.
- Stack `vault` parada (`0/0`) — tentativa anterior, a aposentar.
- Greenfield Infisical: sem CLI/agent/config/secret de Infisical no servidor nem local.

## 3. Arquitetura alvo

```
┌─────────────────────────────────────────────┐
│ Infisical Cloud — projeto "mcad-platform"    │
│ env=prod · pastas por stack · refs p/ shared │
└───────────────┬─────────────────────────────┘
                │ Universal Auth (Machine Identity, escopo leitura prod)
                ▼
┌─────────────────────────────────────────────┐
│ Serviço Swarm "infisical-agent" (manager)    │
│  - monta /var/run/docker.sock                │
│  - 1 template por stack → arquivo .env       │
│  - on-change: materializa docker secrets     │
└───────────────┬─────────────────────────────┘
                │ docker secret create <nome>_<hash>  +  docker service update --secret-add/--secret-rm
                ▼
┌─────────────────────────────────────────────┐
│ Serviços das stacks                          │
│  leem /run/secrets/<nome> via padrão *_FILE  │
└─────────────────────────────────────────────┘
```

**Gotcha central:** docker secrets são imutáveis. Rotação = criar secret com **nome versionado** (`<nome>_<hash8>`), `service update --secret-rm <antigo> --secret-add source=<novo>,target=<nome>`, e podar versões antigas. O `target` mantém o caminho estável (`/run/secrets/<nome>`), então o app não muda.

## 4. Estrutura no Infisical

Projeto único **`mcad-platform`** (já criado). Trabalhamos agora no environment **`dev`** (e `staging` em seguida); **`prod` fica para o futuro**. Pastas por stack; segredos compartilhados na raiz e consumidos via *secret references* (`${...}`), evitando duplicação.

```
/                         (compartilhados)
  RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASSWORD, RABBITMQ_VHOST
  POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
/mecad
  CADASTRO_DB_PASSWORD, IDENTIFICACAO_DB_PASSWORD, ARRECADACAO_DB_PASSWORD,
  DB_PASSWORD_DISTRIBUICAO, STORAGE_LOGTO_CLIENT_ID, STORAGE_LOGTO_CLIENT_SECRET,
  LOGTO_WEBHOOK_SYNC_KEY  (RABBITMQ_*/POSTGRES_* via ref → "/")
/authz
  POSTGRES_PASSWORD, ECAD_AUTHZ_REDIS_PASSWORD, LOGTO_M2M_CLIENT_ID, LOGTO_M2M_CLIENT_SECRET
/auditoria
  AUDIT_DB_PASSWORD, ORACLE_SYS_PASSWORD  (RABBITMQ_* via ref)
/storage
  STORAGE_MONGODB_URI, STORAGE_S3_ACCESS_KEY_ID, STORAGE_S3_SECRET_ACCESS_KEY
/observability
  GRAFANA_TOKEN
/iswc
  DB_ADMIN_PASSWORD_ISWC
/pg-backup
  PG_BACKUP_POSTGRES_PASSWORD, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
```

**Machine Identity** `mcad-agent-prod` com **Universal Auth**, role custom com permissão somente-leitura sobre `prod` (todas as pastas). `client-id`/`client-secret` semeados **uma única vez** como docker secret de bootstrap (`infisical_agent_client_id`, `infisical_agent_client_secret`) — único segredo que permanece fora do Infisical.

## 5. Materialização: o on-change script

O Agent renderiza, por stack, um arquivo `key=value`. Um script (`materialize-secrets.sh`, embutido na imagem do agent ou montado via config) roda em `execute.command` e converte cada par num docker secret versionado e atualiza os serviços que o consomem.

Pseudo-fluxo (idempotente, hash do valor define o nome → sem churn quando nada muda):

```bash
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="$1"                      # ex.: /render/mecad.env
STACK="$2"                         # ex.: mecad
declare -A CONSUMERS=(             # secret lógico -> "serviço:targetpath" (1+)
  [cadastro_db_password]="mecad_mcad-cadastro-api"
  [rabbitmq_password]="mecad_mcad-cadastro-api mecad_mcad-identificacao-api mecad_mcad-bff ..."
  # ...
)
while IFS='=' read -r key val; do
  name=$(echo "$key" | tr 'A-Z' 'a-z')
  hash=$(printf '%s' "$val" | sha256sum | cut -c1-8)
  secret="${name}_${hash}"
  docker secret inspect "$secret" >/dev/null 2>&1 || printf '%s' "$val" | docker secret create "$secret" -
  for svc in ${CONSUMERS[$name]:-}; do
    cur=$(docker service inspect "$svc" --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}:{{.File.Name}} {{end}}')
    echo "$cur" | grep -q "${name}_${hash}:${name}" && continue          # já aplicado
    old=$(echo "$cur" | tr ' ' '\n' | grep ":${name}\$" | cut -d: -f1 || true)
    docker service update --detach=false \
      ${old:+--secret-rm "$old"} \
      --secret-add "source=${secret},target=${name}" "$svc"
  done
done < "$ENV_FILE"
# poda: remove secrets <name>_* não referenciados por nenhum serviço
```

Notas de design:
- **Nome versionado por hash do conteúdo** → re-render idêntico é no-op; mudança de valor gera novo secret e swap automático (rotação).
- **`target` fixo** = caminho estável em `/run/secrets/<name>`; o app nunca muda.
- `--detach=false` serializa o rolling update; tratar `failure_action: rollback` por serviço.
- Poda só remove versões sem referência (mata o problema dos 7 `grafana-token`).
- O mapa `CONSUMERS` é a única peça acoplada às stacks — versionada junto ao design.

> Alternativa considerada e descartada para o cutover inicial: redeploy via Portainer com nome de secret externo (`${X_SECRET}`). Mantemos a indireção `${*_SECRET}` nas YAMLs (como auditoria já faz) como rota de rollback, mas o caminho primário é `service update`, que não exige redeploy de stack inteira.

## 6. Deploy do Agent (serviço Swarm)

`infisical-agent-stack.yml` (esboço):

```yaml
services:
  infisical-agent:
    image: infisical/cli:latest
    command: ["agent", "--config", "/etc/infisical/agent-config.yaml"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock      # materializar secrets
      - render:/render
    configs:
      - source: infisical_agent_config
        target: /etc/infisical/agent-config.yaml
      - source: infisical_materialize_script
        target: /usr/local/bin/materialize-secrets.sh
        mode: 0755
    secrets:
      - infisical_agent_client_id
      - infisical_agent_client_secret
    deploy:
      replicas: 1
      placement:
        constraints: [node.role == manager]
      restart_policy: { condition: on-failure }
volumes: { render: {} }
configs:
  infisical_agent_config: { external: true }
  infisical_materialize_script: { external: true }
secrets:
  infisical_agent_client_id: { external: true }
  infisical_agent_client_secret: { external: true }
```

`agent-config.yaml` (um template por stack):

```yaml
infisical:
  address: "https://app.infisical.com"
auth:
  type: "universal-auth"
  config:
    client-id: "/run/secrets/infisical_ro_id"
    client-secret: "/run/secrets/infisical_ro_secret"
templates:
  - template-content: |
      {{- with listSecretsByProjectSlug "mcad-platform-hx-dc" "dev" "/mecad" `{"recursive": false, "expandSecretReferences": true}` }}
      {{- range . }}
      {{ .Key }}={{ .Value }}
      {{- end }}{{- end }}
    destination-path: /render/mecad.env
    config: { polling-interval: "5m" }
  # ... um bloco por pasta (shared/raiz, authz, auditoria, storage, observability, iswc, pg-backup)
```

> **Materialização via entrypoint, não via `execute`:** o `execute.command` do Agent só dispara *on-change* (não na renderização inicial), o que quebraria o bootstrap. Por isso a imagem usa um `agent-entrypoint.sh` que sobe o agent **e** roda o `materialize-secrets.sh` em loop idempotente (`MATERIALIZE_INTERVAL=60s`). Artefatos reais em `infra/infisical/` (ver runbook lá).

> O acesso ao docker.sock concentra poder no Agent; mitigar com: nó manager dedicado, rede interna, e (futuro) `docker-socket-proxy` restringindo a `secret create`/`service update`.

## 7. Refactor das stacks para `*_FILE`

**Abordagem adotada (decidida na Fase 2):** em vez de `AddKeyPerFile` (.NET) ou `spring.config.import`, usamos um **`entrypoint.sh` por serviço** que lê cada `VAR_FILE` e exporta `VAR` antes de iniciar a app — espelhando o `entrypoint.sh` já comprovado em prod do `audit-service`. Vantagem: uniforme (.NET/Java/Node), **zero mudança de código de app**, tolerante (só carrega o que tiver `_FILE` definido).

```sh
load_secret_file() {              # núcleo do entrypoint (idêntico em todos)
  v="$1"; f="$(eval "printf '%s' \"\${${v}_FILE:-}\"")"
  [ -n "$f" ] && { [ -f "$f" ] || { echo "secret file $f ausente" >&2; exit 1; }; export "$v=$(cat "$f")"; }
}
```

Status por serviço (env vars de segredo confirmadas via inventário do código):

| Serviço | Tipo | Entrypoint | Segredos lidos | Obs |
|---|---|---|---|---|
| cadastro | .NET | ✅ | CADASTRO_DB_PASSWORD, RABBITMQ_PASSWORD, STORAGE_LOGTO_CLIENT_SECRET, PORTAL_JWT_SECRET | app monta `RABBITMQ_URL` dos campos |
| identificacao | .NET | ✅ | IDENTIFICACAO_DB_PASSWORD, RABBITMQ_PASSWORD, STORAGE_LOGTO_CLIENT_SECRET | entrypoint **compõe `RABBITMQ_URL`** (publisher/consumers só leem URL) |
| arrecadacao | Java | ✅ | ARRECADACAO_DB_PASSWORD, RABBITMQ_PASSWORD, STORAGE_LOGTO_CLIENT_SECRET, AUTHZ_SERVICE_TOKEN | campos separados |
| distribuicao | Java | ✅ | DB_PASSWORD_DISTRIBUICAO, RABBITMQ_PASSWORD, CADASTRO_SERVICE_TOKEN | campos separados |
| identity-sync | Node | ✅ | RABBITMQ_PASSWORD, LOGTO_M2M_CLIENT_SECRET, IDENTITY_SYNC_ADMIN_TOKEN | app monta URL dos campos |
| bff | Node | ✅ | AI_RUNTIME_AUTH_SECRET (opcional) | não usa RabbitMQ/DB |
| **authz** | Java | ✅ | ECAD_AUTHZ_DB_PASSWORD, RABBITMQ_PASSWORD, (ECAD_AUTHZ_REDIS_PASSWORD) | repo `ecad-authz`; `_FILE` no `docker-entrypoint.sh` **antes** do `wait_for_postgres`; campos separados → sem URL composta; Dockerfile já cabeava. **Stack `infra/prod/docker-stack.yml` fiada:** postgres `POSTGRES_PASSWORD_FILE` (init sem `\getenv` → sem wrapper), api lê DB+RabbitMQ via `_FILE`. `authz_postgres_password` serve superusuário **e** `ECAD_AUTHZ_DB_PASSWORD` (mesmo valor). Redis deferido (opcional). `LOGTO_M2M_CLIENT_SECRET` não é consumido por este backend |
| **postgres** | infra | ✅ | POSTGRES_PASSWORD (nativo `_FILE`) + 4 senhas de role via wrapper | ver §abaixo |
| auditoria / storage / observability | — | já `_FILE` | — | só repontar source para o secret do Agent |

**postgres (mecad) — RESOLVIDO (2026-06-28):** a imagem oficial aceita `POSTGRES_PASSWORD_FILE` nativamente (superusuário) → usado. As senhas de role (`CADASTRO_DB_PASSWORD`…) são lidas pelos scripts de init via **`\getenv` do psql** (do *ambiente*, não de arquivo) e rodam **só na primeira criação** do banco — inertes no banco existente. Em vez de removê-las (quebraria disaster-recovery: roles com senha vazia em volume novo), um **wrapper de entrypoint** (`infra/infisical/postgres-entrypoint.sh`, montado como config `mcad_postgres_entrypoint`) exporta cada senha de role a partir do respectivo `*_FILE` **antes** de delegar ao `docker-entrypoint.sh` oficial. Resultado: zero senha em texto plano no spec **e** fresh-init seguro. CMD `postgres` da imagem é preservado (override só de `entrypoint:`).

## 8. Plano de execução

| Fase | Conteúdo | Impacto em prod |
|---|---|---|
| 0 | ✅ **Concluída** — projeto + 7 pastas, 34 segredos em `dev`, Machine Identity read-only validada | Nenhum |
| 1 | ✅ **Concluída** — `infisical-agent` em dry-run no servidor; 34 docker secrets versionados materializados; nenhum serviço repointado | Nenhum (secrets criados, não consumidos) |
| 2 | ✅ **Concluída** — entrypoints `_FILE`, Dockerfiles cabeados, stacks fiadas e `CONSUMERS` preenchido | Nenhum (só código/config, em branch) |
| 3 | ✅ **Concluída para `mecad`/`mcad-data`/`mcad-authz`** — cutover via Portainer no VPS 30, validando healthchecks; rollback por stack update/Swarm | Rolling update controlado |
| 4 | 🔄 **Quase concluída** — remover segredos redundantes do Portainer Env; podar órfãos seguros; aposentar stack `vault`. **Troca dos segredos que estavam em texto plano** (tratar como comprometidos) — opcional em dev/staging, **obrigatória alinhada ao cutover de prod** | Rolling update leve / rotação pontual |

## 9. Riscos & mitigação

- **docker.sock no Agent** → superfície de ataque. Mitigar com node manager dedicado + socket-proxy (roadmap).
- **Imutabilidade/rotação** → tratada pelo nome-por-hash + swap; testar em stack de baixo risco primeiro.
- **`.NET` sem `_FILE` nativo** → exige código; validar antes da Fase 2 para não bloquear cutover.
- **Indisponibilidade do Infisical** → o Agent já mantém os últimos secrets materializados no Swarm; serviços não dependem do Infisical em runtime (só na rotação). Sem cache persistente fora de K8s, o Agent re-busca ao reiniciar.
- **Segredos atuais comprometidos** → rotação obrigatória na Fase 4, não apenas migração de valor.

## 10. Itens em aberto

1. ✅ Projeto criado, multipastas, Machine Identity read-only provisionada e validada, gaps de `/storage` resolvidos (mongo/r2 via `.env`).
2. **Fase 2 concluída (2026-06-28):** ~~entrypoint+stack do **authz**~~ ✅; ~~**postgres** (wrapper)~~ ✅; ~~fiação `*_FILE` nos `docker-stack.yml` do mecad e do authz + mapa `CONSUMERS`~~ ✅. **Resta:** **cutover** (Fase 3, §11) — mecad e authz.
3. **Naming dos docker secrets:** prefixo redundante a limpar (`storage_storage_mongodb_uri`, `pg-backup_pg_backup_postgres_password`); definir o `target` final (`/run/secrets/<nome>`) junto do `CONSUMERS`.
4. **Segredos ausentes em prod hoje** (entrypoint tolera, semear só se forem ativados): `AUTHZ_SERVICE_TOKEN`, `CADASTRO_SERVICE_TOKEN`, `AI_RUNTIME_AUTH_SECRET`. `AUDIT_RABBITMQ_URI` desnecessário (audit usa fallback de `RABBITMQ_URL`).
5. Rotação automática (TTL) e **dynamic secrets** (Postgres/Redis) — fora de escopo agora.
6. Nó manager dedicado para o Agent / `docker-socket-proxy` (roadmap de hardening).
7. Replicar seeding para `staging`/`prod` quando for a hora (hoje só `dev`).

## 11. Runbook de cutover do `mecad` (Fase 3)

> **Diferença vs. auditoria:** o spec rodando do `mecad` **ainda não tem `*_FILE`** — hoje injeta senha em texto plano. Logo, o cutover inicial **exige redeploy da stack** (introduz `*_FILE` + `secrets:`), não dá para fazer só com `service update --secret-add` imperativo (que a auditoria usou por já estar em `_FILE`). O caminho imperativo/`CONSUMERS` passa a valer para **rotações** posteriores.

**Pré-requisitos no servidor (`ssh mcad-server`), uma vez:**
```bash
# 1. config do wrapper de entrypoint do postgres
docker config create mcad_postgres_entrypoint infra/infisical/postgres-entrypoint.sh
# 2. Agent materializando os secrets do mecac (já em dry-run desde a Fase 1): confirmar que existem
docker secret ls --filter label=mcad.infisical.managed=true --format '{{.Name}}' | grep -E 'mecad_|^rabbitmq_password|^postgres_password'
```

**Env da stack no Portainer (apontar a indireção `${X_SECRET}` para a versão materializada `<nome>_<hash8>`):**

| Env var no Portainer | Aponta para o docker secret |
|---|---|
| `POSTGRES_PASSWORD_SECRET` | `postgres_password_<hash>` |
| `RABBITMQ_PASSWORD_SECRET` | `rabbitmq_password_<hash>` |
| `CADASTRO_DB_PASSWORD_SECRET` | `mecad_cadastro_db_password_<hash>` |
| `IDENTIFICACAO_DB_PASSWORD_SECRET` | `mecad_identificacao_db_password_<hash>` |
| `ARRECADACAO_DB_PASSWORD_SECRET` | `mecad_arrecadacao_db_password_<hash>` |
| `DISTRIBUICAO_DB_PASSWORD_SECRET` | `mecad_db_password_distribuicao_<hash>` |
| `IDENTIFICACAO_STORAGE_LOGTO_CLIENT_SECRET_SECRET` | `mecad_identificacao_storage_logto_client_secret_<hash>` (secrets de storage-logto são **por domínio** no Infisical) |
| `LOGTO_WEBHOOK_SYNC_KEY_SECRET` | `mecad_logto_webhook_sync_key_<hash>` |

> ⚠️ Aprendizado da auditoria: esses `*_SECRET` vão no **env da stack** (Portainer Env array), **não** no `environment:` de um serviço — senão a interpolação `name: ${X_SECRET:-...}` da seção `secrets:` não enxerga. Sem o env, o `name:` cai no nome lógico (placeholder, inexistente) → a stack falha ao subir. Por isso setar os 8 envs **antes** do redeploy.

**Sequência:**
1. Buildar/publicar as imagens dos 7 serviços com os entrypoints da Fase 2 (já no repo).
2. Setar os 8 envs `*_SECRET` no Portainer.
3. Redeploy da stack `mecad` (Portainer `PUT /api/stacks/{id}` com o `docker-stack.yml` novo).
4. Validar healthchecks serviço a serviço; rollback via `docker service rollback mecad_<svc>` ou revertendo o env+YAML.
5. **postgres:** confere subir `1/1` lendo `POSTGRES_PASSWORD_FILE` no banco existente (init não re-roda). O wrapper só atua em volume novo.

**Verificações divergentes a confirmar antes do cutover:**
- **RabbitMQ do `arrecadacao`:** a YAML default é user/vhost `brhqehoy`, os demais `mcad`. Hoje todos compartilham `${RABBITMQ_PASSWORD}`. Confirmar no env de prod do Portainer que `RABBITMQ_USER`/`RABBITMQ_VHOST` estão setados de forma coerente com a senha compartilhada `rabbitmq_password` (provável: tudo `mcad`, defaults `brhqehoy` mortos).
- Segredos no entrypoint mas **ausentes do spec atual** (não fiados de propósito; entrypoint tolera): `PORTAL_JWT_SECRET` (cadastro), `STORAGE_LOGTO_CLIENT_SECRET`/`AUTHZ_SERVICE_TOKEN` (arrecadacao), `CADASTRO_SERVICE_TOKEN` (distribuicao), `LOGTO_M2M_CLIENT_SECRET`/`IDENTITY_SYNC_ADMIN_TOKEN` (identity-sync), `AI_RUNTIME_AUTH_SECRET` (bff). Fiar quando/se forem ativados.

### 11.1 Cutover do `mcad-authz` (stack separada, `ecad-authz/infra/prod/docker-stack.yml`)

Mesma mecânica (exige redeploy — spec ainda não tem `*_FILE`). 2 serviços, 2 secrets. O init do postgres do authz **não** usa `\getenv`, então **sem wrapper** (só `POSTGRES_PASSWORD_FILE`).

| Env var no Portainer (stack `mcad-authz`) | Aponta para o docker secret |
|---|---|
| `AUTHZ_DB_PASSWORD_SECRET` | `authz_ecad_authz_db_password_<hash>` (pasta /authz, key `ECAD_AUTHZ_DB_PASSWORD`; superusuário **e** `ECAD_AUTHZ_DB_PASSWORD`) |
| `RABBITMQ_PASSWORD_SECRET` | `rabbitmq_password_<hash>` (compartilhado da raiz) |

- **Redis deferido:** `ECAD_AUTHZ_REDIS_PASSWORD` segue como env (`:-` opcional; não há serviço redis na stack). O entrypoint já tolera `ECAD_AUTHZ_REDIS_PASSWORD_FILE` quando for ativado.
- **Verificar:** o `RABBITMQ_PASSWORD` compartilhado pressupõe que authz usa o **mesmo** CloudAMQP que o mecad (authz usa `RABBITMQ_USERNAME`/vhost próprios). Confirmar no Portainer antes do cutover; se for conta/credencial distinta, criar um secret `authz_rabbitmq_password` em `/authz` e apontar `RABBITMQ_PASSWORD_SECRET` para ele.

## 12. Levantamento de prod no VPS 30 + correção do gap de Dockerfile (2026-06-28)

Ao iniciar a Fase 3, a inspeção do ambiente **vivo** (VPS 30 / `mcad-new` / `vmi3396155`, leader) revelou divergências em relação ao que o repo descrevia. O `vmi3283566` antigo está com tudo `0/0` (blue desativado).

### 12.1 Topologia real de prod (≠ repo)
- O banco é um **Postgres compartilhado** — stack **`mcad-data`** (serviço `postgres`, aliases de rede `shared-postgres`/`mcad-postgres`/`mcad-authz-postgres`/`iswc-db`). As stacks `mecad` e `mcad-authz` **não têm** serviço postgres próprio.
- Logo o **wrapper `postgres-entrypoint.sh`** (criado p/ a topologia embarcada do repo) **não se aplica a prod**: o `mcad-data` não tem senhas de role no env (roles criadas em init/migração separado), só `POSTGRES_PASSWORD` (superusuário). Cutover do postgres = só `POSTGRES_PASSWORD_FILE` na stack `mcad-data` (id 19).
- Composes deployados vivem **no Portainer** (fonte da verdade) e driftaram do repo. IDs: **`mecad`=18, `mcad-authz`=17, `mcad-data`=19**. O cutover edita ESSES composes (via `PUT /api/stacks/{id}`), não o `docker-stack.yml` do repo.

### 12.2 Validação de valores (não-destrutiva, via hash)
Comparando `sha256(valor vivo)[:8]` com o sufixo `_<hash8>` dos secrets materializados: **todos os 17 segredos reais batem** — o cutover é *value-safe* (troca o mecanismo, mantém a credencial). Confirmado também:
- **RabbitMQ é compartilhado** por todos os serviços (mesma senha) — a divergência `brhqehoy`/authz era só defaults mortos.
- **`MINIO_SECRET_KEY` (identificacao) está MORTO** — não usam mais minio (migraram p/ storage-service); não materializado; **remover do spec, não migrar**.
- **`LOGTO_M2M_CLIENT_SECRET` do identity-sync = `authz_logto_m2m_client_secret`** (mesmo app M2M do authz; compartilhado).
- Storage-logto são **literais hardcoded** no compose do Portainer (1 por domínio) — exatamente o que a migração elimina; todos batem com `mecad_<dominio>_storage_logto_client_secret`.

### 12.3 Gap de Dockerfile (corrigido) — porque o cutover estava bloqueado
As imagens de prod **não tinham o entrypoint `_FILE`**: `cadastro:88`→`dotnet ...`, `arrecadacao/distribuicao:131`→`java -jar` direto, `authz:sha-78ce737`→`docker-entrypoint.sh` antigo. Só os **Node** (bff, identity-sync) tinham. Causa: os `services/<svc>/docker/entrypoint.sh` existiam e estavam commitados, **mas os Dockerfiles .NET/Java nunca foram alterados** p/ copiá-los/usá-los como ENTRYPOINT. Por isso `cadastro:131` (tentado e revertido p/ `:88`) também não resolvia — ele quebrou por **outra** causa, sem relação com secrets.

**Corrigido (2026-06-28):** os 4 Dockerfiles (.NET cadastro/identificacao com contexto = raiz do repo; Java arrecadacao/distribuicao com contexto = dir do serviço) passaram a `COPY --chmod=0755 <entrypoint.sh> /app/entrypoint.sh` + `ENTRYPOINT ["/app/entrypoint.sh"]` (preservando `JAVA_OPTS`). Cobertura de segredos fechada: `+CADASTRO_LOGTO_CLIENT_SECRET` (identificacao), `+LOGTO_WEBHOOK_SYNC_KEY` (identity-sync).

### 12.4 Sequência correta da Fase 3 (revisada)
1. ✅ Dockerfiles cabeados + cobertura fechada (2026-06-28).
2. ✅ **Build + push** das imagens via CI/CD (push p/ `main`, run 28329723986) → tag **`:133`** (`github.run_number`). Todas com `_FILE` (verificado em `cadastro:133`). Imagens retrocompatíveis (no-op sem `*_FILE`). **mcad** pronto; **authz** (repo `ecad-authz`) ainda precisa de push p/ main p/ rebuildar.
3. **Cutover por stack**, editando o compose **deployado** (Portainer `PUT`): trocar plaintext/literais por `*_FILE` + `secrets:` (indireção `${X_SECRET}` no Env da stack), apontando p/ as versões materializadas. Rollback nativo via `update_config: failure_action: rollback` (`start-first`).
   - ✅ **Piloto `identity-sync` cut over (2026-06-28, stack `mecad` id 18):** `PUT` editando **só** o bloco do serviço (image→`:133`, `RABBITMQ_PASSWORD`/`LOGTO_WEBHOOK_SYNC_KEY`/`IDENTITY_SYNC_ADMIN_TOKEN`/`LOGTO_M2M_CLIENT_SECRET`→`*_FILE`, `RABBITMQ_URL` removida) + top-level `secrets:` + 4 envs `*_SECRET` no Env da stack. Convergiu `1/1` via `start-first`; os outros 6 serviços **não** reiniciaram (spec inalterado). Validado nos logs: `identity_sync_completed fetched:19 published:19 error:null` (Logto M2M + RabbitMQ OK). `LOGTO_M2M_CLIENT_SECRET` aponta p/ o secret compartilhado `authz_logto_m2m_client_secret`.
   - ✅ **Cutover final do `mecad` (2026-06-28):** `cadastro`, `identificacao`, `arrecadacao`, `distribuicao` e `identity-sync` em `:133` com `_FILE`; `frontend` e `bff` mantidos em `:131` sem segredo a migrar. `identificacao` passou a montar DB, RabbitMQ, storage-logto e `CADASTRO_LOGTO_CLIENT_SECRET`; `MINIO_SECRET_KEY` removido.
   - ✅ **Cutover do `mcad-data` (2026-06-28):** `postgres:16-alpine` com `POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password`, apontando para `postgres_password_8bf1ba00`.
   - ✅ **Cutover do `mcad-authz` (2026-06-28):** imagem `tassosgomes/mcad-authz:sha-7f86152`; `ECAD_AUTHZ_DB_PASSWORD_FILE` e `RABBITMQ_PASSWORD_FILE` via docker secrets.
4. Remover `MINIO_SECRET_KEY` (morto) do compose do identificacao.

### 12.5 Fase 4 — limpeza do Portainer Env e poda segura (2026-06-28)

Executado via `PUT /api/stacks/{id}` mantendo o mesmo `StackFileContent` e removendo do **Env array** apenas chaves plaintext que já não eram referenciadas pelo compose durável:

- `mcad-authz` (id 17): removidos `POSTGRES_PASSWORD` e `RABBITMQ_PASSWORD`. Mantidos `AUTHZ_DB_PASSWORD_SECRET` e `RABBITMQ_PASSWORD_SECRET`.
- `mecad` (id 18): removidos `POSTGRES_PASSWORD`, `CADASTRO_DB_PASSWORD`, `IDENTIFICACAO_DB_PASSWORD`, `ARRECADACAO_DB_PASSWORD`, `DB_PASSWORD_DISTRIBUICAO`, `RABBITMQ_PASSWORD`, `MINIO_ROOT_PASSWORD`, `LOGTO_WEBHOOK_SYNC_KEY`, `IDENTITY_SYNC_ADMIN_TOKEN` e `LOGTO_M2M_CLIENT_SECRET`. Mantidos os `*_SECRET` que alimentam a indireção `name: ${...}` dos docker secrets externos.
- `mcad-data` (id 19): removido `POSTGRES_PASSWORD`. Mantido `POSTGRES_PASSWORD_SECRET`.
- `mcad-observability` (id 5): `MCAD_OBSERVABILITY_GRAFANA_TOKEN_SECRET` repontado para `observability_grafana_token_058f58fb`; secret estático `grafana-token` removido após confirmar zero referências.
- `storage-service` (id 15): secrets estáticos `storage_mongodb_uri`, `storage_s3_access_key_id`, `storage_s3_secret_access_key` repontados para versões Infisical mantendo os targets antigos. Primeiro repoint falhou e fez rollback porque `STORAGE_MONGODB_URI` no Infisical tinha `@` não escapado no userinfo (`mongo connect: error parsing uri: unescaped @ sign`). Corrigido alinhando `/storage` no Infisical com os valores vivos dos docker secrets estáticos; agent materializou `storage_storage_mongodb_uri_cd78ab6d`, `storage_storage_s3_access_key_id_b50ce896`, `storage_storage_s3_secret_access_key_05cc065f`; segundo repoint convergiu. Secrets estáticos e versões antigas substituídas removidos.
- `mcad-iswc` (id 16): `DB_ADMIN_PASSWORD` removido do Env array/compose; serviço passou a montar `iswc_db_admin_password_iswc_6012a92b` e usa wrapper de `command:` para exportar `DB_ADMIN_PASSWORD` de `/run/secrets/iswc_db_admin_password_iswc` antes de `node db/init.js && node src/server.js`.
- `pg-backup` (id 13): `POSTGRES_PASSWORD` removido do Env array; `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` removidos do compose. `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` foram semeados em `/pg-backup` no Infisical a partir dos valores vivos; após restart do `infisical-agent`, foram materializados `pg-backup_s3_access_key_id_f66436bc` e `pg-backup_s3_secret_access_key_62a910e6`. Os três serviços de backup passaram a montar `pg-backup_pg_backup_postgres_password_74c59498`, `pg-backup_s3_access_key_id_f66436bc`, `pg-backup_s3_secret_access_key_62a910e6` e usam wrapper de `command:` para exportar envs antes de `sh run.sh`.
- `vault` (id 3): stack parada `0/0` removida do Portainer/Swarm (`DELETE /api/stacks/3?endpointId=1`, HTTP 204).

Validação após a limpeza:

- Swarm: `mecad`, `mcad-authz`, `mcad-data`, `storage-service`, `mcad-observability`, `mcad-iswc` e `pg-backup` em `1/1`; `vault` não aparece mais em `docker stack ls`.
- Health externo: 200 para `https://mcad.tasso.dev.br`, `mcad-cadastro` `/health`, `mcad-identificacao` `/health`, `mcad-arrecadacao` `/actuator/health`, `mcad-distribuicao` `/actuator/health`, `mcad-authz` `/v1/health`, `storage` `/health/live` e `iswc` `/api/health`.
- Poda: removidos `grafana-token`, `storage_mongodb_uri`, `storage_s3_access_key_id`, `storage_s3_secret_access_key`, `storage_storage_mongodb_uri_e444be85`, `storage_storage_s3_access_key_id_63c43015`, `storage_storage_s3_secret_access_key_07108df0`. Não havia versões antigas da auditoria (`audit_db_password`, `*_45ae8a30`, `*_b2c5985d`) para remover. Secrets Infisical ainda sem consumo direto (ex.: client IDs storage-logto) foram mantidos porque o agent pode recriá-los e/ou são valores de configuração não sensíveis.

Resíduo explícito:

- `mcad-authz` ainda mantém `ECAD_AUTHZ_REDIS_URL` em plaintext no Env array e no spec do serviço. O compose ainda referencia `ECAD_AUTHZ_REDIS_URL`, enquanto o entrypoint atual só carrega `ECAD_AUTHZ_DB_PASSWORD`, `RABBITMQ_PASSWORD` e `ECAD_AUTHZ_REDIS_PASSWORD` via `_FILE`; portanto não foi seguro trocar para `authz_ecad_authz_redis_url_58800865` sem novo ajuste de imagem/compose. Próximo passo: migrar Redis para campos separados ou adicionar suporte a `ECAD_AUTHZ_REDIS_URL_FILE`, então remover `ECAD_AUTHZ_REDIS_URL` do Portainer.
- `mcad-observability`, `mecad` e `mcad-data` ainda mantêm `*_SECRET` no Env array por design: são nomes de docker secrets versionados usados pela interpolação `name: ${...}` do compose, não valores de segredo.
