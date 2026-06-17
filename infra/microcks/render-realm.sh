#!/usr/bin/env bash
#
# render-realm.sh — gera o realm do Keycloak do Microcks a partir do template,
# injetando os secrets/host do .env.microcks. O arquivo gerado é GITIGNORED
# (contém secrets) e deve ser disponibilizado ao nó do Swarm no deploy.
#
# Uso:
#   cp infra/microcks/.env.microcks.example infra/microcks/.env.microcks   # e preencha
#   infra/microcks/render-realm.sh
#   -> gera infra/microcks/keycloak-realm/microcks-realm-prod.json
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${MICROCKS_ENV_FILE:-$DIR/.env.microcks}"
TEMPLATE="$DIR/keycloak-realm/microcks-realm-prod.template.json"
OUT="$DIR/keycloak-realm/microcks-realm-prod.json"

[[ -f "$ENV_FILE" ]] || { echo "ERRO: $ENV_FILE não encontrado (copie de .env.microcks.example)." >&2; exit 1; }
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${MICROCKS_HOST:?defina MICROCKS_HOST no .env.microcks}"
: "${KEYCLOAK_ADMIN_PASSWORD:?defina KEYCLOAK_ADMIN_PASSWORD no .env.microcks}"
: "${MICROCKS_AUTOMATION_SECRET:?defina MICROCKS_AUTOMATION_SECRET no .env.microcks}"

python3 - "$TEMPLATE" "$OUT" <<'PY'
import os, sys
template, out = sys.argv[1], sys.argv[2]
data = open(template, encoding="utf-8").read()
repl = {
    "__MICROCKS_HOST__": os.environ["MICROCKS_HOST"],
    "__ADMIN_PASSWORD__": os.environ["KEYCLOAK_ADMIN_PASSWORD"],
    "__AUTOMATION_SECRET__": os.environ["MICROCKS_AUTOMATION_SECRET"],
}
for k, v in repl.items():
    data = data.replace(k, v)
open(out, "w", encoding="utf-8").write(data)
print(f"realm gerado: {out}")
PY
