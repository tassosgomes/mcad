# Migração VPS 40 → VPS 20 — Inventário e Plano

> Data do levantamento: 2026-06-24
> Origem: Contabo VPS 40 — 12 vCPU / 48 GB RAM — `161.97.71.19` (`vmi3283566`), disco 193 GB (48 GB usados)
> Destino (DECIDIDO): Contabo **VPS 30 — 8 vCPU / 24 GB RAM / 400 GB SSD** (Contabo não faz downgrade in-place → server novo + migração)
> Tudo a migrar está no **Docker Swarm** (1 nó, manager/leader). Demais itens do host = fora de escopo.
> Responsabilidades do operador (você): DNS, Tailscale, IP filtering do MongoDB externo.
>
> **Decisões fechadas (2026-06-24):**
> - Alvo = **VPS 30**. Cabe tudo (≈11,5 GiB de RSS em 24 GB ≈ 50% uso). **Migração lift-and-shift, sem cortes de stack.**
> - Migrar **todos os dados** (disco de 400 GB absorve os ~6,9 GB de volumes com folga).
> - **Reduzir mecad para 1 réplica** (bff/cadastro/frontend/identificacao) — single-node não dá HA real.
> - **socat → bind no IP da Tailscale** (sem publicar em 0.0.0.0). Ver §3.1.

---

## 1. Conclusão de capacidade (alvo = VPS 30)

| | Atual (medido) | VPS 30 (alvo) | VPS 20 (descartado) |
|---|---|---|---|
| RAM total | 47 GiB (13 GiB em uso) | **24 GB** (~22 úteis) | 12 GB (~11 úteis) |
| RSS somado dos containers | **≈ 11,5 GiB** | ~50% de uso, ~11 GiB livres ✅ | estouraria ❌ |
| vCPU | 12 (ocioso na maior parte) | 8 (folga p/ PoC) | 6 |
| Swap | **0 B** (nenhum) | criar 2–4 GB | — |
| Disco | 48 GB / 193 GB | 400 GB SSD | dados ~6,9 GB |

**No VPS 30 cabe tudo com folga** — todos os 18 stacks migram como estão, sem decisão de corte.
Reduzir mecad p/ 1 réplica adiciona ~0,5 GiB de margem. (VPS 20 foi descartado: forçaria dropar
microcks + oracle + transfernow e ficaria sem margem nem swap.)

### Rollup de RAM por grupo (RSS medido, snapshot `docker stats`)

| Grupo | Stacks | RAM aprox. | Migra? |
|---|---|---|---|
| **Core mcad (app + infra)** | mecad, mcad-data, mcad-authz, storage-service, mcad-iswc, traefik, pg-backup, infisical-agent, observability, uptime, portainer, socat | **≈ 4,8 GiB** | **Sim** |
| audit-example (Oracle Free) | audit-example | ≈ 2,5 GiB | **Decidir** |
| mcad-microcks (mock async) | mcad-microcks | ≈ 2,9 GiB | **Decidir** |
| transfernow (app separado) | transfernow | ≈ 1,2 GiB | **Decidir** |
| oidc-teste | oidc-teste | ~10 MiB | **Decidir** |
| Escalados a zero (0/0) | mcad-ai, vault | 0 | Definir |

> Só o **core** (≈4,8 GiB) cabe com folga em 12 GB. Cada stack pesado adicionado consome a margem:
> core + microcks ≈ 7,7 GiB (OK) · core + microcks + oracle + transfernow ≈ 11,5 GiB (**sem margem → OOM**).

---

## 2. Inventário completo de stacks (18) e serviços

| Stack | Serviços | RAM aprox. | Stateful (volume) | Classificação |
|---|---|---|---|---|
| **mecad** | frontend(2), bff(2), cadastro-api(2), identificacao-api(2), arrecadacao-api(1), distribuicao-api(1), identity-sync(1) | 2,1 GiB | `mecad_mcad_pg_data` (237M) | **Core — app** |
| **mcad-data** | postgres:16 | 172 MiB | `mcad-data_pgdata` (263M) | **Core — DB principal** |
| **mcad-authz** | authz-api (JVM) | 1,0 GiB | `mcad-authz_mcad_authz_pg_data` (48M) | **Core — authz** |
| **storage-service** | api, clamav | 971 MiB | `storage-clamav-data` (168M, re-baixável) | **Core — uploads/AV** |
| **mcad-iswc** | iswc-api | 31 MiB | `mcad-iswc_iswc-postgres-data` (39M) | **Core** |
| **traefik** | traefik:v3.6 | 51 MiB | — | **Core — reverse proxy** |
| **pg-backup** | backup mcad/authz/iswc → S3 | 16 MiB | — | **Core — backup** |
| **infisical-agent** | agent (render secrets) | 48 MiB | `infisical-agent_render` (36K) | **Core — secrets** |
| **mcad-observability** | alloy, cadvisor | 238 MiB | `..._alloy_data` (212K) | Core — obs (opcional) |
| **uptime** | uptime-kuma | 134 MiB | `uptime_uptime_kuma_data` (77M) | Core — monitor (opcional) |
| **portainer** | portainer-ce, agent(global) | 59 MiB | `portainer_portainer_data` (3,7M) | Infra — gestão |
| **socat** | pg-proxy(:5432), oracle-proxy(:1521) | 3 MiB | — | Infra — proxies TCP |
| **audit-example** | audit-service, **oracle-free** | **2,5 GiB** | `audit-oracle-data` (**5,2G**) | Exemplo/demo |
| **mcad-microcks** | app, async-minion, kafka, keycloak, mongo, lavinmq, postman | **2,9 GiB** | mongo(369M), kafka, lavinmq | Mock async |
| **transfernow** | api, frontend, keycloak, minio, postgres, minio-bootstrap(job) | **1,2 GiB** | postgres(75M), minio(8,5M) | App separado |
| **oidc-teste** | app | 10 MiB | — | Teste |
| **mcad-ai** | cadastro-api (orchestrator) | 0 (0/0) | — | Escalado a zero |
| **vault** | vault:1.18 | 0 (0/0) | `vault_vault_data` (324K) | Escalado a zero |

### Replicas reduzíveis (single-node, sem HA real)
`mecad` roda 2 réplicas de bff, cadastro-api, frontend, identificacao-api. Num nó só, 2 réplicas não dão HA — **reduzir para 1** economiza ~0,5–0,7 GiB e CPU. Manter 2 só se houver motivo (rolling deploy sem downtime).

---

## 3. Dependências EXTERNAS (não migram — você opera)

| Dependência | Onde | Acesso | Ação na migração |
|---|---|---|---|
| MongoDB (storage-service) | externo | `storage_mongodb_uri` (secret) | **IP filtering**: liberar IP novo (você) |
| S3 (storage + pg-backup) | externo | `storage_s3_*`, backups | Conferir bucket/policy aceita IP novo |
| CloudAMQP (RabbitMQ) | kebnekaise.lmq.cloudamqp.com | `rabbitmq_*` secrets | Sem mudança (saída) |
| Logto (OIDC) | 9lcinu.logto.app | `*_logto_*` secrets | Registrar URIs/origem se IP/DNS mudar |
| socat_pg-proxy :5432 | bridge p/ `shared-postgres:5432` (overlay, **local**) | acesso dev | Rebind Tailscale (§3.1) |
| socat_oracle-proxy :1521 | bridge p/ `oracle:1521` (overlay, **local**) | acesso dev | Rebind Tailscale (§3.1) |

### 3.1 socat — eliminar portas públicas (decisão de segurança)

**Situação atual:** os dois socat publicam via **ingress do Swarm em `*:5432` / `*:1521` (0.0.0.0)** — escutam em
TODAS as interfaces, inclusive o IP público. Há regras UFW limitando a `100.64.0.0/10` (Tailscale), **mas
portas publicadas pelo Docker passam pela chain `DOCKER-INGRESS` antes do UFW** → o filtro pode não se aplicar.
Não confiar no UFW como barreira única (vide incidente Postgres anterior).

**Função ainda necessária?** Sim — os bancos vivem dentro da overlay; o socat é a ponte host→overlay p/ acesso dev.

**Correção no VPS novo — bind só no IP da Tailscale (Opção A, recomendada):**
container socat anexado à overlay (`--attachable`) publicando `-p <tailscale-ip>:5432:5432`. O socket não existe
na interface pública → **zero exposição por construção**, sem depender do UFW. Acesso dev igual ao de hoje
(`MCAD_DB_MODE=direct` → `<tailscale-ip>:5432`). Alternativa B (máxima segurança): socat em `127.0.0.1` + `ssh -L`
por cima da Tailscale (sem porta de rede alguma).

> ⚠️ O IP Tailscale do host NOVO será diferente (hoje: `100.77.143.43`). Atualizar bind + configs `direct` no cutover.

---

## 4. Dados a migrar (volumes nomeados)

Núcleo mcad é **minúsculo** — só os Postgres importam, somam **< 0,6 GB**:

| Volume | Tamanho | Conteúdo | Estratégia |
|---|---|---|---|
| `mcad-data_pgdata` | 263 M | Postgres principal (mecad schemas) | `pg_dump`/`pg_dumpall` lógico → restore |
| `mecad_mcad_pg_data` | 237 M | Postgres (2º — confirmar uso) | idem (investigar duplicidade) |
| `mcad-authz_mcad_authz_pg_data` | 48 M | DB do authz | `pg_dump` → restore |
| `mcad-iswc_iswc-postgres-data` | 39 M | DB ISWC | `pg_dump` → restore |
| `uptime_uptime_kuma_data` | 77 M | Histórico de monitor | rsync volume (parado) ou recriar |
| `portainer_portainer_data` | 3,7 M | Config Portainer | rsync ou reconfigurar |
| `vault_vault_data` | 324 K | Raft Vault (se reativar) | rsync (Vault parado) |
| `storage-clamav-data` | 168 M | Assinaturas ClamAV | **não migrar** — freshclam re-baixa |
| `audit-oracle-data` | 5,2 G | Oracle do exemplo | só se mantiver audit-example |
| `mcad-microcks_*` | ~370 M | Mongo/Kafka do mock | só se mantiver microcks |
| `transfernow_*` | ~85 M | DB/minio do app | só se mantiver transfernow |

> **Recomendado para Postgres: dump lógico** (não copiar o data dir bruto) — versão `postgres:16-alpine` igual nos dois lados, mais seguro que rsync de PGDATA. `pg-backup` já faz dumps p/ S3 → existe caminho de restore pronto.

Secrets (≈50) e configs (15) do Swarm precisam ser **recriados no nó novo** (não são exportáveis do Swarm em claro). Fonte da verdade = Infisical (já há `infisical-agent` + `.env.swarm.example`). Há versões antigas a limpar (ex.: `grafana_token` v1–v5, secrets duplicados sem hash).

---

## 5. Runbook de execução (blue/green por DNS)

**Modelo:** server novo sobe em paralelo no IP próprio, valida-se via IP direto / `/etc/hosts`, e o
cutover é só troca de DNS + Tailscale. **Rollback = reverter DNS** (TTL baixo antes). Os dois hosts
coexistem durante a janela; o VPS 40 só é desligado após observação.

Legenda: 🤖 = eu executo (via SSH) · 👤 = você (DNS/Tailscale/IP-filter) · ⏱️ = exige janela de manutenção.

### Fase 0 — Pré-requisitos (sem downtime)
- 👤 Provisionar **VPS 30**, anotar IP público novo.
- 🤖/👤 Garantir que **todos os ~50 secrets têm fonte recuperável** (Infisical / `.env.swarm`). Secret do
  Swarm não é legível de volta — o que não estiver no Infisical precisa ser localizado **antes** do cutover.
- 👤 Baixar TTL do DNS dos domínios (`*.tasso.dev.br`) p/ 60–300s com antecedência.

### Fase 1 — Host novo: base, hardening, Docker, Swarm
- 🤖 Instalar Docker + UFW + fail2ban; replicar regras UFW do antigo **exceto 5432/1521 públicas**
  (22, 80, 443, 9443, 2377, 7946/tcp+udp, 4789/udp).
- 🤖 **Criar 2–4 GB de swap** (host atual tem 0 — rede de segurança obrigatória).
- 👤 Instalar e logar Tailscale → **anotar novo IP `100.x`**.
- 🤖 `docker swarm init --advertise-addr <ip-privado/tailscale>`.

### Fase 2 — Imagens
- 🤖 `docker pull` de tudo em registry: `tassosgomes/*` + imagens públicas (postgres, traefik, keycloak,
  kafka, mongo, clamav, minio, portainer, etc.).
- 🤖 Imagens **locais sem registry** → `docker save | ssh novo docker load` (ou rebuild):
  `transfernow-api:1`, `transfernow-frontend:1`, `mcad-infisical-agent:latest`.

### Fase 3 — Secrets, configs, networks
- 🤖 Recriar **overlay networks** declaradas (`--attachable` onde precisar, ex. rede do socat).
- 🤖 Recriar **~50 secrets** via Infisical/`.env.swarm` + `docker secret create`.
- 🤖 Recriar **15 configs** a partir dos arquivos do repo (alloy, `postgres_0*` init scripts, microcks realm).
- 🧹 Aproveitar p/ não recriar duplicados/versionados mortos (`grafana_token` v1–v5, alloy v1–v5).

### Fase 4 — Deploy dos stacks (ainda sem dados) na ordem de dependência
1. `traefik` (rede `traefik-public`; certs ACME re-emitem após DNS apontar — validar TLS na Fase 7).
2. `mcad-data` (postgres vazio) → `infisical-agent`.
3. `mcad-authz`, `mcad-iswc`, `storage-service`.
4. `mecad` (**já com 1 réplica** em bff/cadastro/frontend/identificacao).
5. `mcad-observability`, `uptime`, `portainer`, `pg-backup`, **`socat` (bind Tailscale — §3.1)**.
6. `mcad-microcks`, `audit-example`, `transfernow`, `oidc-teste`.
7. `mcad-ai`, `vault` a **0/0** (definição padrão; reativar sob demanda).

### Fase 5 — Migração de dados ⏱️
- **Postgres (dump lógico)** — para cada DB: `mcad-data_pgdata`, `mecad_mcad_pg_data`, `mcad-authz`,
  `mcad-iswc`, `transfernow_postgres`. Procedimento: parar/colocar writers em pausa (janela curta) →
  `pg_dump`/`pg_dumpall` no antigo → `psql`/`pg_restore` no novo → conferir contagens. Versão 16 igual nos
  dois lados. (`pg-backup` p/ S3 já dá um caminho de restore alternativo.)
- **Oracle** (audit-example, 5,2 GB): rsync do volume `audit-oracle-data/_data` com serviço parado (é demo).
- **Volumes a preservar** (rsync com serviço parado): `uptime_uptime_kuma_data` (histórico),
  `portainer_portainer_data` (config), `mcad-microcks_microcks_mongo_data`, `transfernow_minio-data`,
  `vault_vault_data`+`_logs`.
- **Não migrar**: `storage-clamav-data` (freshclam re-baixa); volumes anônimos (hash) órfãos.

### Fase 6 — Validação (host novo, antes do DNS)
- 🤖 Health checks de todos os serviços; smoke test frontend → bff → APIs (via IP direto / `/etc/hosts`).
- 🤖 Conferir Postgres restaurado (contagens por schema), uptime-kuma verde, Portainer acessível.

### Fase 7 — Cutover ⏱️
- 👤 Apontar **DNS** (`*.tasso.dev.br`, storage, minio, iswc, authz, audit, microcks...) p/ IP público novo.
- 👤 Liberar **IP novo no IP-filter** do MongoDB externo e do S3; remover IP antigo depois.
- 🤖 Validar **re-emissão TLS** (ACME) no Traefik após DNS propagar.
- 👤 Atualizar refs Tailscale / `MCAD_DB_MODE=direct` p/ novo IP `100.x` (socat rebind — §3.1).

### Fase 8 — Decomissionar
- Após janela de observação (24–48h): desligar stacks no VPS 40 e cancelar o plano.

---

## 7. Log de execução (2026-06-24)

**Servidor novo:** `5.189.160.137` (`vmi3396155`), Ubuntu 24.04, 8 vCPU / 23 GB / 387 GB.
Alias SSH local: `mcad-new` (chave `id_ed25519_mcad`). Antigo: `mcad-server` (`161.97.71.19`).

**Concluído:**
- ✅ **Fase 1** — swap 4 GB, fail2ban (sshd), Docker 29.6.0, UFW (paridade; 5432/1521 só Tailscale), `swarm init` (node leader).
- ✅ **Fase 2 (imagens)** — 35 imagens de registry (públicas, sem auth) em pull; 3 locais (`mcad-infisical-agent:latest`, `transfernow-api:1`, `transfernow-frontend:1`) via `docker save|load`.
- ✅ **Fase 3 (secrets/configs/redes)** —
  - 8 secrets EM USO recriados (transferidos old→new por pipe SSH, valores nunca expostos): `audit_db_password`, `rabbitmq_password`, `infisical_ro_id/secret`, `grafana-token`, `storage_mongodb_uri`, `storage_s3_access_key_id/secret_access_key`.
  - 4 configs em uso: `config-alloy-v5`, `infisical_agent_config`, `microcks_minion_props`, `microcks_realm_v2`.
  - 5 redes overlay externas: `traefik-public`, `shared-db`, `audit-net`, `mcad-observability-net`, `vault-net`.
  - **Achado:** serviços ainda consomem só os 8 secrets legados (migração Infisical em dry-run/Fase 1, serviços não repontados). Senhas de DB chegam via env var (Portainer stack env), não via docker secret. Os ~40 secrets com hash do Infisical existem mas não são usados → não precisam migrar p/ o lift-and-shift.

**Definições de stack coletadas** (em scratchpad): 14 via API Portainer (compose+env) + 4 CLI (mcad-data, transfernow `/opt/transfernow`, portainer `/root/portainer-agent-stack.yml`, socat `/root/tailscale-db-proxy-stack.yml`). `mcad-data_postgres` = postgres simples em `shared-db`, db `postgres`, sem configs init (legado).

**4 instâncias Postgres a migrar (dump/restore):** mcad-data (`mcad-data_pgdata`), mcad-authz (`mcad_authz_pg_data`), mcad-iswc (`iswc-postgres-data`), transfernow (`transfernow_postgres-data`).

**Pendente:** finalizar pull · ajustar mecad→1 réplica + socat→bind Tailscale · deploy dos stacks · migração de dados (janela) · cutover.

## 8. RESULTADO FINAL (cutover concluído 2026-06-24/25)

**Migração concluída e em produção no VPS 30 (`5.189.160.137`). DNS virado.**

Estado: **35/40 serviços 1/1**; 4 em 0/0 (mcad-ai + vault por design; audit-service + transfernow_minio pausados — follow-ups); + 2 proxies socat standalone na Tailscale (`100.79.84.118`, bind exclusivo, sem porta pública).

**Validado em produção (DNS real, sem --resolve):** frontend `mcad.tasso.dev.br` 200, cadastro/identificacao `/health` 200, authz/arrecadacao `/actuator/health` 200, iswc 200. TLS Let's Encrypt válido (acme.json copiado → **zero downtime de TLS**, DNS-01 Cloudflare).

**Dados migrados e verificados (count exato old=new):** shared-postgres (mcad 53 tab, ecad_authz 10, iswc 3 — roles `*_svc` preservados) + transfernow (users/files). Volumes órfãos `mcad_authz_pg_data`/`iswc-postgres-data` ignorados (confirmado: 1 postgres compartilhado).

**Achados importantes durante a migração:**
- `cadastro-api`: registry tag **`:131` está QUEBRADA (SIGSEGV)**; produção rodava **`:88`**. Repontado p/ `:88` (env do Portainer estava drifted em `:131` mas nunca promovido).
- Imagens locais (sem registry): `transfernow-api:1`, `transfernow-frontend:1`, `mcad-infisical-agent:latest` → migradas via `docker save|load`.
- Imagens pinadas por digest no Swarm; tags `latest`/`:88` podem driftar — sempre conferir digest do serviço real.

### Follow-ups pendentes (não-core, não bloqueiam)
1. **audit-service** (demo/Oracle): (a) volume `audit-oracle-data` (5,2 GB) **não migrado** → Oracle novo vazio, sem schema de auditoria; (b) a imagem `audit-service:0.1.3` tem `ENV JAVA_OPTS="..."` **com aspas baked-in (quebrada)** — Portainer sobrescrevia. Decisão: migrar o volume Oracle e setar JAVA_OPTS limpo, ou descartar o stack. Pausado em 0/0.

   **✅ RESOLVIDO 2026-06-27 (subiu 1/1):** ao subir o serviço, ele tomava `ORA-01017: invalid credential ... logon denied` em loop e o Flyway nunca rodava (daí "sem tabelas"). **Causa raiz — duas fontes de senha divergentes:** o `gvenzl/oracle-free` cria o `APP_USER` (=`AUDIT_APP`) **só no bootstrap de volume vazio**, lendo `APP_USER_PASSWORD` do **env da stack** — que no novo servidor estava com os **placeholders do `.env.example`** (`APP_USER_PASSWORD=change-me-audit-password`, `ORACLE_PASSWORD=change-me-sys-password`). Já o `audit-service` autentica via **docker secret** `audit_db_password` (`AUDIT_DB_PASSWORD_FILE`, valor real do Infisical migrado na Fase 3). Placeholder ≠ secret → ORA-01017. **Fix aplicado:** `ALTER USER AUDIT_APP IDENTIFIED BY <valor-do-secret>` (conectado como `system/change-me-sys-password` no FREEPDB1), depois `service scale=1` → Flyway aplicou `V1__audit_repository.sql` e o schema foi criado. Gotcha do `sqlplus`: usar `SET DEFINE OFF` antes do ALTER (`&` na senha vira variável de substituição).

   **✅ Rotação de senhas + cutover p/ Infisical (2026-06-27):** aproveitando o destravamento, as senhas placeholder foram trocadas por **senhas fortes (32 chars) com o Infisical como fonte da verdade** — ver detalhes no design do Infisical (`infisical-secrets-migration-design.md`, nota 2026-06-27). Resumo: (1) `AUDIT_DB_PASSWORD` e `ORACLE_SYS_PASSWORD` atualizados via API no Infisical (env `dev`, `/auditoria`); o agent materializou `auditoria_audit_db_password_e28b7b0a` e `auditoria_oracle_sys_password_71e00622`; (2) `ALTER USER` no Oracle: `SYS`/`SYSTEM` (`CONTAINER=ALL`, conectado ao CDB `FREE` as sysdba) + `AUDIT_APP` (no PDB `FREEPDB1`), lendo os valores dos secrets materializados; (3) `audit-service` **repointado** (imperativo) p/ o secret gerenciado (`--secret-add source=auditoria_audit_db_password_e28b7b0a,target=audit_db_password`). Serviço `1/1` healthy.

   **✅ Gotcha resolvido — PDB não reabria após restart:** depois de um restart do Oracle o `FREEPDB1` voltava **MOUNTED** (não OPEN) → `ORA-01109: database not open` no Flyway/Hikari. Fix permanente: `ALTER PLUGGABLE DATABASE FREEPDB1 OPEN` + **`SAVE STATE`** (reabre sozinho em todo restart). Os `ORA-17008 (Closed connection)` vistos logo após o restart são WARN do housekeeper do HikariPool descartando conexões mortas — auto-resolvem.

   **Pendências (não bloqueiam, serviço já no ar):**
   - **Higiene de env / durabilidade do cutover (recomendado, FAZER):** o repoint foi **imperativo** (`service update`), então a definição da stack no Portainer ainda aponta p/ o secret estático `audit_db_password` (default). **Um Update da stack pelo Portainer reverteria** p/ o secret antigo → ORA-01017. No env da stack `audit-example` no Portainer: setar `AUDIT_DB_PASSWORD_SECRET=auditoria_audit_db_password_e28b7b0a` (a YAML já tem a indireção `name: ${AUDIT_DB_PASSWORD_SECRET:-audit_db_password}`) e corrigir `AUDIT_DB_PASSWORD`/`ORACLE_SYS_PASSWORD` p/ os valores reais (copiar da UI do Infisical), removendo os `change-me-*`. Lembrete permanente: o gvenzl não suporta `_FILE`, então o env de bootstrap **tem de espelhar** o secret.
   - **Limpar secrets órfãos (após a higiene acima):** remover o estático `audit_db_password` (`docker secret rm`, depois que o Portainer apontar p/ o gerenciado) e podar as versões antigas materializadas (`auditoria_audit_db_password_45ae8a30`, `auditoria_oracle_sys_password_b2c5985d`).
   - ~~**Histórico Oracle antigo:** o schema novo nasceu vazio (volume não migrado).~~ **✅ RESTAURADO 2026-06-27 (via Data Pump):** trazido o histórico do `mcad-server` (`161.97.71.19`) p/ o VPS 30. `expdp` `content=DATA_ONLY` + `flashback_time=systimestamp` das 3 tabelas com dados (`AUDIT_EVENT`, `AUDIT_EVENT_DEDUP`, `AUDIT_EVENT_FIELD`); dump de ~234 MB transferido old→workstation→new; `impdp` `table_exists_action=TRUNCATE` (substituiu as 7 linhas de teste do pós-cutover). **Resultado verificado:** `AUDIT_EVENT`=66.574, `AUDIT_EVENT_DEDUP`=66.574, `AUDIT_EVENT_FIELD`=516; FK `FK_AUDIT_EVENT_FIELD_EVENT` reativada com `ENABLE VALIDATE` (integridade referencial OK). audit-service 1/1 healthy. Aprendizados: (a) sem senha de SYS — `expdp`/`impdp` rodam como **`AUDIT_APP`** lendo a senha do secret montado em `/run/secrets/audit_db_password` do container `audit-service`; diretório Data Pump criado via OS-auth `sqlplus / as sysdba` dentro do container; (b) `docker exec` no `gvenzl/oracle-free` roda como `oracle` (não root) → usar `-u 0` p/ ajustar perms do dump; (c) tabelas particionadas por intervalo (mês) — partições recriam no insert. **Com isso o `mcad-server` antigo não tem mais dependência de dados → liberado p/ decomissionar.**
2. ~~**transfernow_minio**: minio roda **perfeito ad-hoc** mas a task do Swarm falha (exit 1, sem log) — pausado em 0/0.~~ **✅ RESOLVIDO 2026-06-26:** scale p/ 1 subiu normalmente (task Running, healthy) — a falha anterior era do contexto do cutover, não se reproduziu. Bucket `transfernow` presente (dados migrados), teste multipart+SSE-S3 (12 MB) OK, `transfernow_api` alcança o minio. Isso corrigia o `503 "Storage operation failed ... create_multipart"` nos uploads. Stack gerenciada pelo Portainer com `replicas: 1` → sem drift.

### Pós-cutover
- Old (`161.97.71.19`): writers escalados a 0 (drenado). **Manter ligado 24-48h** como rollback (reverter DNS p/ ele). Depois decomissionar.
- Rollback = apontar DNS de volta p/ `161.97.71.19` e reescalar writers no old.

**Bloqueios do operador — todos resolvidos:** ✅ allowlist IP no Mongo/S3 · ✅ Tailscale no node novo (`100.79.84.118`) · ✅ janela executada · ✅ DNS virado.

### Riscos / atenção
- **Swap = 0 hoje** → criar no novo é obrigatório.
- **Imagens locais** (transfernow, infisical-agent) não estão em registry — salvar/rebuild.
- **Secrets não-recuperáveis**: validar fonte ANTES do cutover (Swarm não devolve secret em claro).
- **ACME/TLS**: certs só re-emitem após DNS apontar p/ o host novo (HTTP-01) — prever breve indisponibilidade
  de TLS no cutover, ou usar DNS-01.
- **socat**: trocar ingress 0.0.0.0 por bind Tailscale **antes** de expor o host (§3.1).
- **Consistência de dados**: dump Postgres exige writers parados na janela — combinar horário.

---

## 6. Decisões (fechadas)

- ✅ Alvo **VPS 30** — migra **todos** os 18 stacks (audit-example, microcks, transfernow inclusos).
- ✅ Migrar todos os dados (disco 400 GB sobra).
- ✅ mecad **→ 1 réplica** (bff, cadastro, frontend, identificacao).
- ✅ socat **→ bind no IP da Tailscale** (sem porta pública) — §3.1.
- ⏳ mcad-ai / vault (0/0): subir no novo também a zero (definição padrão), reativar sob demanda.
- 🧹 Oportunidade de higiene durante a migração: limpar secrets/configs versionados duplicados
  (`grafana_token` v1–v5, configs alloy v1–v5, etc.) — não arrastar lixo.

---

## 9. Adoção das stacks pelo Portainer (2026-06-26)

Pós-migração, as stacks no VPS 30 tinham sido criadas via CLI (`docker stack deploy`) →
apareciam no Portainer como **external/limited** (0 gerenciadas; sem Editor/Update). Trazidas
para gestão completa do Portainer.

**Descoberta-chave:** Portainer **não adota stack in-place** — criar com namespace já existente
retorna `409 "A stack with the normalized name already exists"`. Único caminho:
`docker stack rm <nome>` → recriar via API Portainer (`POST /api/stacks/create/swarm/string`).
**Downtime curto por stack** (inerente). Dados seguros: `stack rm` **não remove volumes**;
secrets/networks são `external: true` (intactos) → no recreate tudo reanexa.

**Ferramentas** (em `mcad-new:/root/migration/`, root-only): `adopt.py <stack>` (auth +
POST com compose+env de `stacks/<n>.compose.yml`/`.env`, mesma fonte do `deploy.sh`) e
`adopt-one.sh <stack>` (rm → espera cleanup → adopt com **retry 4×** → re-zera serviços que
estavam pausados em 0/0). swarmID `puqm1tbeg4gvkowlwbmjz7mkk`, endpoint 1.

**Gotcha resolvido — race de overlay interna:** stacks multi-serviço com network overlay
*não-externa* (microcks, storage-service, infisical-agent) falharam no 1º deploy com
`network <x> not found` (Portainer cria a overlay e dispara os serviços antes da propagação).
O Portainer faz rollback limpo → **retry resolve** (embutido no wrapper).

**Resultado:** **16/16 stacks-alvo agora gerenciadas** pelo Portainer (editáveis). `portainer`
(auto-gestão) e `socat` (containers standalone, não-stack) ficaram de fora por design.
Pausados preservados em 0/0: `mcad-ai`, `vault`, `audit-example_audit-service`,
`transfernow_minio`. `cadastro-api` permaneceu em `:88` (tag boa; não regrediu p/ `:131`).

**Validado (DNS real + TLS):** frontend 200, cadastro/identificacao `/health` 200,
arrecadacao/distribuicao/authz `/actuator/health` 200, iswc 200. Dados Postgres intactos
(cadastro 16 tab, identificacao 11, arrecadacao 12, distribuicao 14).
