#!/usr/bin/env bash
# materialize-secrets.sh — converte um arquivo key=value renderizado pelo Infisical Agent
# em docker secrets versionados (nome = <prefix>_<key>_<hash8>) e, opcionalmente, repointa
# os serviços que os consomem.
#
# Uso:  materialize-secrets.sh <env-file> [prefix]
#   <env-file>  arquivo key=value (uma linha por segredo)
#   [prefix]    prefixo de pasta (ex.: "mecad", "authz"); vazio = segredos compartilhados (raiz)
#
# Variáveis de ambiente:
#   APPLY=1     além de criar os secrets, executa `docker service update` para repointar
#               os serviços (cutover, Fase 3). SEM APPLY → dry-run: só cria/loga (Fase 1).
#   PRUNE=1     remove versões antigas (<name>_*) não referenciadas por nenhum serviço.
#
# Imutabilidade do Swarm: secrets não mudam in-place. O nome versionado por hash do
# conteúdo torna re-render idêntico um no-op; mudança de valor gera novo secret + swap,
# com `target` fixo (caminho estável em /run/secrets/<name>).
set -euo pipefail

ENV_FILE="${1:?uso: materialize-secrets.sh <env-file> [prefix]}"
PREFIX="${2:-}"
APPLY="${APPLY:-0}"
PRUNE="${PRUNE:-0}"

# Mapa secret-lógico -> serviços Swarm consumidores. Preenchido na Fase 2, conforme cada
# stack passa a ler via padrão *_FILE em /run/secrets. Enquanto vazio, o script só cria os
# secrets (dry-run), nunca repointa serviços — comportamento esperado na Fase 1.
declare -A CONSUMERS=(
  # --- stack mecad (Fase 2 — fiação concluída em docker-stack.yml) ---
  # Compartilhados (render: shared.env, sem prefixo).
  [postgres_password]="mecad_mcad-postgres"
  [rabbitmq_password]="mecad_mcad-cadastro-api mecad_mcad-identificacao-api mecad_mcad-arrecadacao-api mecad_mcad-distribuicao-api mecad_mcad-identity-sync-api mcad-authz_mcad-authz-api"
  # Pasta /mecad (render: mecad.env, prefixo "mecad"). As senhas de role também são montadas no
  # postgres p/ o init de volume novo (lidas via *_FILE pelo wrapper; inertes no banco existente).
  [mecad_cadastro_db_password]="mecad_mcad-cadastro-api mecad_mcad-postgres"
  [mecad_identificacao_db_password]="mecad_mcad-identificacao-api mecad_mcad-postgres"
  [mecad_arrecadacao_db_password]="mecad_mcad-arrecadacao-api mecad_mcad-postgres"
  [mecad_db_password_distribuicao]="mecad_mcad-distribuicao-api mecad_mcad-postgres"
  [mecad_identificacao_storage_logto_client_secret]="mecad_mcad-identificacao-api"
  [mecad_logto_webhook_sync_key]="mecad_mcad-identity-sync-api"
  # --- stack mcad-authz (Fase 2 concluída — entrypoint + fiação YAML) ---
  # authz_ecad_authz_db_password (pasta /authz, key ECAD_AUTHZ_DB_PASSWORD) é o superusuário do
  # postgres E o ECAD_AUTHZ_DB_PASSWORD do api. RabbitMQ usa o compartilhado da raiz. Redis deferido.
  [authz_ecad_authz_db_password]="mcad-authz_mcad-authz-postgres mcad-authz_mcad-authz-api"
  # [authz_ecad_authz_redis_password]="mcad-authz_mcad-authz-api"   # quando ativar redis com senha
  # NB: o cutover INICIAL do mecad exige redeploy da stack (introduz os *_FILE no spec, que hoje
  # não existem). O caminho imperativo (APPLY=1) abaixo serve para ROTAÇÕES posteriores, quando o
  # spec já lê via *_FILE — diferente da auditoria, que já tinha *_FILE e fez swap só imperativo.
)

log(){ echo "[materialize $(printf '%(%H:%M:%S)T' -1)] $*"; }

secret_logical(){ # nome lógico (sem hash) a partir da chave + prefixo
  local key_lc; key_lc=$(printf '%s' "$1" | tr 'A-Z' 'a-z')
  [ -n "$PREFIX" ] && printf '%s_%s' "$PREFIX" "$key_lc" || printf '%s' "$key_lc"
}

while IFS='=' read -r key val; do
  [ -z "$key" ] && continue
  case "$key" in \#*) continue;; esac
  # Ignora linhas malformadas (chave que não é um identificador env válido). Protege contra
  # valores multi-linha cuja continuação seria interpretada como uma chave espúria.
  case "$key" in
    [A-Za-z_]*) :;;
    *) log "! ignorando linha malformada (chave inválida): '$key'"; continue;;
  esac
  case "$key" in *[!A-Za-z0-9_]*) log "! ignorando linha malformada (chave inválida): '$key'"; continue;; esac
  name=$(secret_logical "$key")
  hash=$(printf '%s' "$val" | sha256sum | cut -c1-8)
  versioned="${name}_${hash}"

  if docker secret inspect "$versioned" >/dev/null 2>&1; then
    log "= $versioned já existe (no-op)"
  else
    printf '%s' "$val" | docker secret create \
      --label mcad.infisical.managed=true \
      --label "mcad.infisical.logical=$name" \
      "$versioned" - >/dev/null
    log "+ criado $versioned"
  fi

  svcs="${CONSUMERS[$name]:-}"
  [ -z "$svcs" ] && continue
  for svc in $svcs; do
    cur=$(docker service inspect "$svc" --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}}:{{.File.Name}} {{end}}' 2>/dev/null || true)
    if printf '%s' "$cur" | grep -q "${versioned}:${name}"; then
      log "  = $svc já usa $versioned"; continue
    fi
    old=$(printf '%s' "$cur" | tr ' ' '\n' | grep ":${name}\$" | cut -d: -f1 || true)
    if [ "$APPLY" = "1" ]; then
      docker service update --detach=false \
        ${old:+--secret-rm "$old"} \
        --secret-add "source=${versioned},target=${name}" "$svc" >/dev/null
      log "  ~ $svc repointado para $versioned (removido: ${old:-nenhum})"
    else
      log "  [dry-run] repointaria $svc: +$versioned${old:+ -$old} (rode com APPLY=1 para cutover)"
    fi
  done
done < "$ENV_FILE"

if [ "$PRUNE" = "1" ] && [ "$APPLY" = "1" ]; then
  in_use=$(docker service ls -q | xargs -r -n1 docker service inspect --format '{{range .Spec.TaskTemplate.ContainerSpec.Secrets}}{{.SecretName}} {{end}}' | tr ' ' '\n' | sort -u)
  docker secret ls --filter label=mcad.infisical.managed=true --format '{{.Name}}' | while read -r s; do
    printf '%s\n' "$in_use" | grep -qx "$s" || { docker secret rm "$s" >/dev/null && log "- podado $s (sem referência)"; }
  done
fi
