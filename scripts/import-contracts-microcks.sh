#!/usr/bin/env bash
#
# import-contracts-microcks.sh — importa os contratos de contracts/ no Microcks.
#
# Faz upload dos OpenAPI + AsyncAPI como "main artifacts". Reusável no CI (Fase 3).
#
# Local (Keycloak desabilitado — protótipo):
#   MICROCKS_URL=http://localhost:18081 scripts/import-contracts-microcks.sh
#
# Swarm (Keycloak habilitado — usa client de automação via client_credentials):
#   MICROCKS_URL=https://mcad-docs.tasso.dev.br \
#   MICROCKS_HOST=mcad-docs.tasso.dev.br \
#   MICROCKS_AUTOMATION_SECRET=... \
#   scripts/import-contracts-microcks.sh
#
# Se infra/microcks/.env.microcks existir, ele é carregado automaticamente.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
ENV_FILE="${MICROCKS_ENV_FILE:-$ROOT_DIR/infra/microcks/.env.microcks}"
[[ -f "$ENV_FILE" ]] && { set -a; # shellcheck disable=SC1090
  source "$ENV_FILE"; set +a; }

MICROCKS_URL="${MICROCKS_URL:-http://localhost:18081}"
CLIENT_ID="${MICROCKS_AUTOMATION_CLIENT_ID:-microcks-automation}"

FILES=(
  cadastro/openapi.json
  cadastro/asyncapi.json
  identificacao/openapi.json
  identificacao/asyncapi.json
  arrecadacao/openapi.json
  arrecadacao/asyncapi.yaml
  distribuicao/openapi.json
  distribuicao/asyncapi.yaml
)

AUTH_HEADER=()
if [[ -n "${MICROCKS_AUTOMATION_SECRET:-}" ]]; then
  token_url="${KEYCLOAK_TOKEN_URL:-https://${MICROCKS_HOST:?defina MICROCKS_HOST ou KEYCLOAK_TOKEN_URL}/auth/realms/microcks/protocol/openid-connect/token}"
  echo "Obtendo token (client_credentials, client=$CLIENT_ID)…"
  token=$(curl -s --max-time 15 -X POST "$token_url" \
    -d grant_type=client_credentials -d "client_id=$CLIENT_ID" -d "client_secret=$MICROCKS_AUTOMATION_SECRET" \
    | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))")
  [[ -n "$token" ]] || { echo "ERRO: não obtive access_token de $token_url" >&2; exit 1; }
  AUTH_HEADER=(-H "Authorization: Bearer $token")
else
  echo "Sem MICROCKS_AUTOMATION_SECRET — upload sem autenticação (modo local/Keycloak off)."
fi

fail=0
for rel in "${FILES[@]}"; do
  f="$CONTRACTS_DIR/$rel"
  [[ -f "$f" ]] || { echo "ERRO: $rel não existe (rode scripts/export-contracts.sh)" >&2; fail=1; continue; }
  resp=$(curl -s --max-time 30 "${AUTH_HEADER[@]}" -F "file=@$f" "$MICROCKS_URL/api/artifact/upload?mainArtifact=true" || true)
  if [[ "$resp" == *":"* && "$resp" != *"error"* && "$resp" != *"<html"* ]]; then
    printf "ok   %-28s -> %s\n" "$rel" "$resp"
  else
    printf "FALHA %-28s -> %s\n" "$rel" "${resp:0:120}"; fail=1
  fi
done

# Overlays de exemplos (APIExamples) — artefatos SECUNDÁRIOS (mainArtifact=false).
# Auto-descobre contracts/<svc>/examples.yaml. Precisam vir DEPOIS dos primários.
shopt -s nullglob
for f in "$CONTRACTS_DIR"/*/examples.yaml; do
  rel="${f#$CONTRACTS_DIR/}"
  resp=$(curl -s --max-time 30 "${AUTH_HEADER[@]}" -F "file=@$f" "$MICROCKS_URL/api/artifact/upload?mainArtifact=false" || true)
  if [[ "$resp" == *":"* && "$resp" != *"error"* && "$resp" != *"<html"* ]]; then
    printf "ok   %-28s -> %s (exemplos)\n" "$rel" "$resp"
  else
    printf "FALHA %-28s -> %s\n" "$rel" "${resp:0:120}"; fail=1
  fi
done
shopt -u nullglob

[[ $fail -eq 0 ]] && echo "OK — contratos importados." || { echo "FALHA em um ou mais contratos." >&2; exit 1; }
