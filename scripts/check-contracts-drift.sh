#!/usr/bin/env bash
#
# check-contracts-drift.sh — drift-gate dos contratos.
#
# Sobe os 4 serviços contra a infra LOCAL (docker-compose.dev.yml), gera os specs
# e compara com os arquivos versionados em contracts/ (via export-contracts.sh --check).
# Falha (exit 1) se algum contrato commitado divergir do que o código gera.
#
# Pré-requisito: infra local de pé com Postgres + RabbitMQ:
#   docker compose -f docker-compose.dev.yml up -d mcad-postgres mcad-rabbitmq
#
# Uso:
#   scripts/check-contracts-drift.sh            # sobe, checa, derruba
#   KEEP_RUNNING=1 scripts/check-contracts-drift.sh   # não derruba ao final (debug)
#
# Env seguro: RabbitMQ forçado para localhost (nunca o broker de produção do .env),
# DB via superusuário gestauto, authz sem registro no startup, Logto real p/ OIDC.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
LOG_DIR="$(mktemp -d)"
PIDS=()
OIDC="${OIDC_AUTHORITY:-https://9lcinu.logto.app/oidc}"

common_rmq="RABBITMQ_HOST=localhost RABBITMQ_PORT=5672 RABBITMQ_USER=mcad RABBITMQ_PASSWORD=mcad RABBITMQ_VHOST=mcad"

cleanup() {
  [[ "${KEEP_RUNNING:-0}" == "1" ]] && { echo "KEEP_RUNNING=1 — serviços seguem de pé."; return; }
  echo "→ derrubando serviços…"
  pkill -f "spring-boot:run" 2>/dev/null || true
  for p in 5001 5100; do
    pid=$(ss -ltnp 2>/dev/null | grep ":$p " | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
    [[ -n "${pid:-}" ]] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT

wait_http() { # url, name, tries
  local url="$1" name="$2" tries="${3:-40}"
  for ((i=1;i<=tries;i++)); do
    [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 4 "$url" 2>/dev/null)" == "200" ]] && { echo "  ✓ $name"; return 0; }
    sleep 5
  done
  echo "  ✗ $name não respondeu ($url)"; echo "--- log $name ---"; tail -20 "$LOG_DIR/$name.log" 2>/dev/null; return 1
}

echo "→ build/install dos módulos Java…"
mvn -q -f services/arrecadacao-api/pom.xml -pl arrecadacao-api -am install -DskipTests >"$LOG_DIR/build-arr.log" 2>&1
mvn -q -f services/distribuicao-api/pom.xml -pl distribuicao-api -am install -DskipTests >"$LOG_DIR/build-dist.log" 2>&1

echo "→ subindo serviços…"
( cd services/arrecadacao-api && env $common_rmq \
    ARRECADACAO_DB_HOST=localhost ARRECADACAO_DB_PORT=5432 ARRECADACAO_DB_NAME=mcad \
    ARRECADACAO_DB_USER=gestauto ARRECADACAO_DB_PASSWORD=gestauto123 ARRECADACAO_DB_SSL_MODE=disable \
    OIDC_AUTHORITY="$OIDC" AUTHZ_CATALOG_REGISTRATION_REQUIRED=false AUTHZ_BASE_URL=http://localhost:8085 OTEL_SDK_DISABLED=true \
    mvn -q -pl arrecadacao-api spring-boot:run ) >"$LOG_DIR/arrecadacao.log" 2>&1 &

( cd services/distribuicao-api && env $common_rmq \
    DB_HOST=localhost DB_PORT=5432 DB_NAME=mcad DB_SCHEMA_DISTRIBUICAO=distribuicao \
    DB_USER_DISTRIBUICAO=gestauto DB_PASSWORD_DISTRIBUICAO=gestauto123 \
    OIDC_AUTHORITY="$OIDC" ECAD_AUTHZ_REGISTER_ON_STARTUP=false ECAD_AUTHZ_BASE_URL=http://localhost:8081 OTEL_SDK_DISABLED=true \
    mvn -q -pl distribuicao-api spring-boot:run ) >"$LOG_DIR/distribuicao.log" 2>&1 &

( cd services/cadastro-api/1-Services/Cadastro.API && env $common_rmq \
    CADASTRO_DB_HOST=localhost CADASTRO_DB_PORT=5432 CADASTRO_DB_NAME=mcad CADASTRO_DB_SCHEMA=cadastro \
    CADASTRO_DB_USER=gestauto CADASTRO_DB_PASSWORD=gestauto123 CADASTRO_DB_SSL_MODE=Disable \
    OIDC_AUTHORITY="$OIDC" ASPNETCORE_ENVIRONMENT=Development AUTH_ENABLED=false Authz__Enabled=false \
    PORTAL_JWT_SECRET=dev-only-portal-secret-for-spec-generation-0123456789 \
    dotnet run --launch-profile http ) >"$LOG_DIR/cadastro.log" 2>&1 &

( cd services/identificacao-api/1-Services/Identificacao.API && env $common_rmq \
    IDENTIFICACAO_DB_HOST=localhost IDENTIFICACAO_DB_PORT=5432 IDENTIFICACAO_DB_NAME=mcad IDENTIFICACAO_DB_SCHEMA=identificacao \
    IDENTIFICACAO_DB_USER=gestauto IDENTIFICACAO_DB_PASSWORD=gestauto123 IDENTIFICACAO_DB_SSL_MODE=Disable \
    OIDC_AUTHORITY="$OIDC" ASPNETCORE_ENVIRONMENT=Development AUTH_ENABLED=false Authz__Enabled=false \
    dotnet run --launch-profile http ) >"$LOG_DIR/identificacao.log" 2>&1 &

echo "→ aguardando health…"
ok=0
wait_http http://localhost:5003/v3/api-docs arrecadacao || ok=1
wait_http http://localhost:5004/v3/api-docs distribuicao || ok=1
wait_http http://localhost:5001/swagger/v1/swagger.json cadastro || ok=1
wait_http http://localhost:5100/swagger/v1/swagger.json identificacao || ok=1
[[ $ok -ne 0 ]] && { echo "FALHA: nem todos os serviços subiram."; exit 1; }

echo "→ checando drift (export-contracts.sh --check)…"
scripts/export-contracts.sh --check
rc=$?
[[ $rc -eq 0 ]] && echo "✓ contratos em dia." || echo "✗ DRIFT detectado — rode scripts/export-contracts.sh e commite contracts/."
exit $rc
