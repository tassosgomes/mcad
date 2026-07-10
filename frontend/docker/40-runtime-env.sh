#!/bin/sh
set -eu

export CADASTRO_API_BASE_URL="${CADASTRO_API_BASE_URL:-}"
export IDENTIFICACAO_API_BASE_URL="${IDENTIFICACAO_API_BASE_URL:-}"
export ARRECADACAO_API_BASE_URL="${ARRECADACAO_API_BASE_URL:-}"
export DISTRIBUICAO_API_BASE_URL="${DISTRIBUICAO_API_BASE_URL:-}"
export AUDITORIA_API_BASE_URL="${AUDITORIA_API_BASE_URL:-}"
export AUTHZ_API_BASE_URL="${AUTHZ_API_BASE_URL:-/api/authz/v1}"
export PORTAL_API_BASE_URL="${PORTAL_API_BASE_URL:-https://mcad-bff.tasso.dev.br/api/cadastro/v1/portal}"
export OIDC_AUTHORITY="${OIDC_AUTHORITY:-}"
export OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-}"
export OIDC_AUDIENCE="${OIDC_AUDIENCE:-}"
export OIDC_REDIRECT_URI="${OIDC_REDIRECT_URI:-}"
export OIDC_POST_LOGOUT_REDIRECT_URI="${OIDC_POST_LOGOUT_REDIRECT_URI:-}"

# Portal do Titular — segredo HMAC-SHA256 do backend (≥ 32 bytes).
# O frontend não consome este valor; a validação fail-fast acontece no startup do
# cadastro-api (Program.cs). Exportado aqui apenas para documentação de deploy.
export PORTAL_JWT_SECRET="${PORTAL_JWT_SECRET:-}"

required_vars="
CADASTRO_API_BASE_URL
IDENTIFICACAO_API_BASE_URL
ARRECADACAO_API_BASE_URL
DISTRIBUICAO_API_BASE_URL
AUDITORIA_API_BASE_URL
AUTHZ_API_BASE_URL
OIDC_AUTHORITY
OIDC_CLIENT_ID
OIDC_AUDIENCE
OIDC_REDIRECT_URI
OIDC_POST_LOGOUT_REDIRECT_URI
"

for var_name in $required_vars; do
  eval "value=\${$var_name}"
  if [ -z "$value" ]; then
    echo "ERROR: $var_name is required."
    exit 1
  fi
done

# Portal do Titular — avisa (não bloqueia) se o secret do backend estiver ausente.
# O container do frontend não usa este secret; o cadastro-api valida fail-fast no startup.
if [ -z "$PORTAL_JWT_SECRET" ]; then
  echo "WARNING: PORTAL_JWT_SECRET is not set. cadastro-api will fail-fast on startup."
fi

envsubst '${CADASTRO_API_BASE_URL} ${IDENTIFICACAO_API_BASE_URL} ${ARRECADACAO_API_BASE_URL} ${DISTRIBUICAO_API_BASE_URL} ${AUDITORIA_API_BASE_URL} ${AUTHZ_API_BASE_URL} ${PORTAL_API_BASE_URL} ${OIDC_AUTHORITY} ${OIDC_CLIENT_ID} ${OIDC_AUDIENCE} ${OIDC_REDIRECT_URI} ${OIDC_POST_LOGOUT_REDIRECT_URI}' \
  < /usr/share/nginx/html/runtime-env.template.js \
  > /usr/share/nginx/html/runtime-env.js

rm /usr/share/nginx/html/runtime-env.template.js

echo "runtime-env.js generated."
