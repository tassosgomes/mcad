# Plano de rollout — HashiCorp Vault no Swarm mcad

> Status: Fase 1 (subir stack) executada em 2026-05-28.
> Fases 2 a 5 ficam para janelas futuras.

## Decisões já tomadas
- **Onde rodar:** mesmo Docker Swarm do mcad (single-node, self-hosted)
- **Modo de unseal:** Shamir manual (3 de 5 chaves) — sem dependência cloud
- **Modo de consumo pelas apps:** Vault Agent injector (template renderiza arquivo em `/vault/secrets/`, app le como env-file)
- **Backend de storage:** Raft integrated storage (single-node por enquanto, expansível para HA depois)
- **Exposição:** UI/API só na rede overlay interna; acesso humano via tunnel SSH ou bastion

## Fase 1 — Subir Vault (FEITO 2026-05-28)
Entregáveis:
- Overlay `vault-net` criada
- Stack `vault` no Portainer rodando em modo "server" (não dev)
- `vault operator init` executado; 5 chaves Shamir + root token armazenados offline
- KV v2 habilitado em path `kv/`
- Audit log habilitado (file backend) em `/vault/logs/audit.log`
- Procedimento de unseal documentado neste arquivo

## Fase 2 — Migrar secrets para KV v2
Sem mexer nas apps ainda. Apenas popular Vault em paralelo aos env vars do Portainer.

Estrutura proposta:
```
kv/mcad/postgres/postgres        password=...
kv/mcad/postgres/gestauto        password=...
kv/mcad/postgres/authz           password=...
kv/mcad/postgres/arrecadacao_svc password=...
kv/mcad/postgres/cadastro_svc    password=...
kv/mcad/postgres/identificacao_svc password=...
kv/mcad/postgres/distribuicao_app password=...
kv/mcad/postgres/iswc            password=...
kv/mcad/rabbitmq/brhqehoy        username=brhqehoy password=...
kv/mcad/minio/root               username=mcadadmin password=...
kv/mcad/logto/m2m                client_id=... client_secret=...
kv/mcad/logto/webhook            sync_key=...
kv/mcad/s3-backup/r2             access_key_id=... secret_access_key=...
```

## Fase 3 — Provar fluxo Vault Agent com 1 serviço
Sugestão: `mcad-authz` (escopo pequeno, baixo risco).

Passos:
1. Criar policy Vault `mcad-authz-policy`:
   ```hcl
   path "kv/data/mcad/postgres/authz" { capabilities = ["read"] }
   path "kv/data/mcad/rabbitmq/brhqehoy" { capabilities = ["read"] }
   ```
2. Habilitar auth method `approle`
3. Criar role `mcad-authz-role` com binding na policy acima, TTL 24h
4. Gerar `role_id` (estável) + `secret_id` wrapped (descartável)
5. Modificar stack mcad-authz no Portainer:
   - Adicionar service `vault-agent` no mesmo task (sidecar via shared volume `vault-secrets`)
   - Vault Agent template renderiza `/vault/secrets/db.env`:
     ```
     ECAD_AUTHZ_DB_PASSWORD={{ with secret "kv/data/mcad/postgres/authz" }}{{ .Data.data.password }}{{ end }}
     RABBITMQ_PASSWORD={{ with secret "kv/data/mcad/rabbitmq/brhqehoy" }}{{ .Data.data.password }}{{ end }}
     ```
   - Modificar entrypoint de mcad-authz-api para `source /vault/secrets/db.env` antes do java -jar
6. Remover `POSTGRES_PASSWORD` e `RABBITMQ_PASSWORD` do Env do stack
7. Redeploy via Portainer, validar `pg_stat_activity` mostra `authz` conectado

## Fase 4 — Rollout para outros services
Mesmo padrão da Fase 3, sequencial (NÃO em lote):
- mcad-iswc → user `iswc`
- mecad_mcad-cadastro-api → user `cadastro_svc`
- mecad_mcad-identificacao-api → user `identificacao_svc`
- mecad_mcad-arrecadacao-api → user `arrecadacao_svc`
- mecad_mcad-distribuicao-api → user `distribuicao_app`
- mecad_mcad-identity-sync-api → Logto secrets
- mecad_mcad-bff → secrets se houver
- pg-backup_db-backup-* → user `postgres` + S3 keys

Para cada um: policy + role + sidecar + remoção de env var do Portainer.

## Fase 5 — Dynamic credentials (futuro distante)
Substituir KV estático pelo Database Secrets Engine do Vault:
- Vault conecta no Postgres como admin
- Apps requisitam credentials a cada N horas; Vault cria user efêmero com TTL
- Em caso de vazamento, comprometido auto-expira

Pré-requisitos: apps com pool de conexão que aceita reconfiguração (Hikari/Npgsql conseguem; precisa adaptar para refresh).

---

## Procedimento de Unseal (Shamir manual)

Após qualquer restart do container Vault:

```bash
# 1. SSH no servidor swarm
sshpass -e ssh root@161.97.71.19

# 2. Localizar container Vault
docker ps --filter "name=vault_vault" --format "{{.ID}}"

# 3. Verificar status (deve mostrar sealed=true)
docker exec <CID> vault status

# 4. Aplicar 3 chaves de unseal (use 3 das 5 chaves geradas no init)
docker exec -it <CID> vault operator unseal
# Entrar com chave 1
docker exec -it <CID> vault operator unseal
# Entrar com chave 2
docker exec -it <CID> vault operator unseal
# Entrar com chave 3

# 5. Confirmar (deve mostrar sealed=false)
docker exec <CID> vault status
```

**ATENÇÃO:** as 5 chaves Shamir e o root token foram gerados pelo `vault operator init` no Fase 1 e devem ser armazenados em **locais distintos e seguros**. Sugestão de distribuição:
- Chave 1: 1Password vault pessoal
- Chave 2: Google Drive criptografado com GPG
- Chave 3: Cofre físico/USB criptografado
- Chave 4: Outro colaborador (quando houver)
- Chave 5: Backup encriptado off-site

Root token: usar UMA VEZ para criar tokens de admin com TTL; depois revogar o root.

## Acesso humano à UI/API do Vault
Não expor publicamente. Acesso recomendado:

```bash
# Tunel SSH local:8200 → vault container:8200
ssh -L 8200:vault:8200 root@161.97.71.19
# Abrir http://localhost:8200 no navegador
```

Ou variantes via Tailscale/WireGuard quando configurado.
