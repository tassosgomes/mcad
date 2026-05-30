#!/usr/bin/env bash
# dev.sh - ambiente de desenvolvimento local/hibrido do MCAD.
#
# Exemplos:
#   ./dev.sh up                         # stack app: APIs, BFF, AI e frontend
#   ./dev.sh up frontend                # somente frontend, proxyando para BFF dev
#   ./dev.sh up cadastro-api bff frontend
#   ./dev.sh down
#   ./dev.sh status
#   ./dev.sh logs bff

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$ROOT_DIR/.tmp/logs"
PID_DIR="$ROOT_DIR/.tmp/pids"

mkdir -p "$LOGS_DIR" "$PID_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[mcad]${NC} $*"; }
success() { echo -e "${GREEN}[mcad]${NC} $*"; }
warn() { echo -e "${YELLOW}[mcad]${NC} $*"; }
error() { echo -e "${RED}[mcad]${NC} $*" >&2; }

APP_SERVICES=(
  cadastro-api
  identificacao-api
  arrecadacao-api
  distribuicao-api
  ai-orchestrator
  bff
  frontend
)

ALL_SERVICES=(
  cadastro-api
  identificacao-api
  arrecadacao-api
  distribuicao-api
  ai-orchestrator
  bff
  identity-sync-api
  frontend
)

START_ORDER=(
  db-tunnel
  cadastro-api
  identificacao-api
  arrecadacao-api
  distribuicao-api
  ai-orchestrator
  bff
  identity-sync-api
  frontend
)

DB_SERVICES=(cadastro-api identificacao-api arrecadacao-api distribuicao-api)

usage() {
  cat <<'EOF'
Uso:
  ./dev.sh up [app|all|apis|frontend|servicos...]
  ./dev.sh down [servicos...]
  ./dev.sh restart [servicos...]
  ./dev.sh status
  ./dev.sh logs [servico]

Servicos:
  cadastro-api identificacao-api arrecadacao-api distribuicao-api
  ai-orchestrator bff identity-sync-api frontend db-tunnel

Atalhos:
  app       cadastro-api identificacao-api arrecadacao-api distribuicao-api ai-orchestrator bff frontend
  all       app + identity-sync-api
  apis      cadastro-api identificacao-api arrecadacao-api distribuicao-api ai-orchestrator bff identity-sync-api
  frontend  somente o frontend; se bff nao subir localmente, usa o BFF de desenvolvimento

Variaveis principais:
  MCAD_DB_MODE=ssh-tunnel|direct|local-compose     (default: ssh-tunnel)
  MCAD_DB_SSH_HOST=mcad-server                     (alias SSH do servidor)
  MCAD_DB_REMOTE_HOST=shared-postgres
  MCAD_DB_REMOTE_PORT=5432
  MCAD_DB_LOCAL_PORT=15432                         (opcional; se vazio, escolhe porta livre)
  MCAD_ENV_FILE=.env
  MCAD_LOCAL_ENV_FILE=.env.local
EOF
}

pid_file() {
  echo "$PID_DIR/$1.pid"
}

read_pid() {
  cat "$(pid_file "$1")" 2>/dev/null || true
}

is_running() {
  local pid
  pid="$(read_pid "$1")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

save_pid() {
  echo "$2" >"$(pid_file "$1")"
}

load_env_file() {
  local env_file="$1"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

load_env() {
  local env_file="${MCAD_ENV_FILE:-.env}"
  local local_env_file="${MCAD_LOCAL_ENV_FILE:-.env.local}"

  load_env_file "$ROOT_DIR/$env_file"
  load_env_file "$ROOT_DIR/$local_env_file"
}

contains() {
  local needle="$1"
  shift

  for item in "$@"; do
    [[ "$item" == "$needle" ]] && return 0
  done

  return 1
}

has_any_db_service() {
  local selected=("$@")

  for service in "${DB_SERVICES[@]}"; do
    contains "$service" "${selected[@]}" && return 0
  done

  return 1
}

validate_service() {
  local service="$1"

  case "$service" in
    app|all|apis|frontend|db-tunnel|cadastro-api|identificacao-api|arrecadacao-api|distribuicao-api|ai-orchestrator|bff|identity-sync-api)
      return 0
      ;;
    *)
      error "Servico desconhecido: $service"
      usage
      exit 2
      ;;
  esac
}

expand_targets() {
  local raw=("$@")

  if [[ "${#raw[@]}" -eq 0 ]]; then
    raw=(app)
  fi

  local expanded=()
  local target

  for target in "${raw[@]}"; do
    validate_service "$target"

    case "$target" in
      app)
        expanded+=("${APP_SERVICES[@]}")
        ;;
      all)
        expanded+=("${ALL_SERVICES[@]}")
        ;;
      apis)
        expanded+=(cadastro-api identificacao-api arrecadacao-api distribuicao-api ai-orchestrator bff identity-sync-api)
        ;;
      frontend)
        expanded+=(frontend)
        ;;
      *)
        expanded+=("$target")
        ;;
    esac
  done

  local deduped=()

  for service in "${START_ORDER[@]}"; do
    if contains "$service" "${expanded[@]}" && ! contains "$service" "${deduped[@]}"; then
      deduped+=("$service")
    fi
  done

  if contains frontend "${deduped[@]}" && has_any_db_service "${deduped[@]}" && ! contains bff "${deduped[@]}"; then
    warn "Frontend com API local requer BFF local; adicionando bff."
    deduped+=(bff)
  fi

  if has_any_db_service "${deduped[@]}" && [[ "${MCAD_DB_MODE:-ssh-tunnel}" == "ssh-tunnel" ]] && ! contains db-tunnel "${deduped[@]}"; then
    deduped=(db-tunnel "${deduped[@]}")
  fi

  printf '%s\n' "${deduped[@]}"
}

remote_url_for() {
  case "$1" in
    cadastro-api) echo "${DEV_CADASTRO_API_BASE_URL:-https://mcad-cadastro.tasso.dev.br/api/v1}" ;;
    identificacao-api) echo "${DEV_IDENTIFICACAO_API_BASE_URL:-https://mcad-identificacao.tasso.dev.br/api/v1}" ;;
    arrecadacao-api) echo "${DEV_ARRECADACAO_API_BASE_URL:-https://mcad-arrecadacao.tasso.dev.br/api/v1}" ;;
    distribuicao-api) echo "${DEV_DISTRIBUICAO_API_BASE_URL:-https://mcad-distribuicao.tasso.dev.br/api/v1}" ;;
    ai-orchestrator) echo "${DEV_AI_ORCHESTRATOR_BASE_URL:-https://mcad-bff.tasso.dev.br/api/ai/v1}" ;;
    bff) echo "${DEV_BFF_BASE_URL:-https://mcad-bff.tasso.dev.br}" ;;
    *) return 1 ;;
  esac
}

local_url_for() {
  case "$1" in
    cadastro-api) echo "http://localhost:5001/api/v1" ;;
    identificacao-api) echo "http://localhost:5100/api/v1" ;;
    arrecadacao-api) echo "http://localhost:5003/api/v1" ;;
    distribuicao-api) echo "http://localhost:5004/api/v1" ;;
    ai-orchestrator) echo "http://localhost:5300/v1" ;;
    bff) echo "http://localhost:5200" ;;
    *) return 1 ;;
  esac
}

upstream_url_for() {
  local service="$1"
  shift
  local selected=("$@")

  if contains "$service" "${selected[@]}"; then
    local_url_for "$service"
  else
    remote_url_for "$service"
  fi
}

parse_rabbitmq_url() {
  [[ -z "${RABBITMQ_URL:-}" ]] && return 0

  local uri without_scheme credentials hostportpath hostport path
  uri="$RABBITMQ_URL"
  without_scheme="${uri#*://}"

  if [[ "$without_scheme" == *"@"* ]]; then
    credentials="${without_scheme%@*}"
    hostportpath="${without_scheme#*@}"
    export RABBITMQ_USER="${RABBITMQ_USER:-${credentials%%:*}}"
    export RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD:-${credentials#*:}}"
  else
    hostportpath="$without_scheme"
  fi

  hostport="${hostportpath%%/*}"
  path=""
  [[ "$hostportpath" == */* ]] && path="${hostportpath#*/}"

  export RABBITMQ_HOST="${RABBITMQ_HOST:-${hostport%%:*}}"

  if [[ "$hostport" == *":"* ]]; then
    export RABBITMQ_PORT="${RABBITMQ_PORT:-${hostport##*:}}"
  else
    case "$uri" in
      amqps://*) export RABBITMQ_PORT="${RABBITMQ_PORT:-5671}" ;;
      *) export RABBITMQ_PORT="${RABBITMQ_PORT:-5672}" ;;
    esac
  fi

  if [[ "$uri" == amqps://* ]]; then
    export SPRING_RABBITMQ_SSL_ENABLED="${SPRING_RABBITMQ_SSL_ENABLED:-true}"
  fi

  if [[ -n "$path" && "$path" != "$hostportpath" ]]; then
    export RABBITMQ_VHOST="${RABBITMQ_VHOST:-$path}"
  fi
}

configure_common_env() {
  local selected=("$@")

  export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
  export AUTH_ENABLED="${AUTH_ENABLED:-true}"
  export OIDC_AUTHORITY="${OIDC_AUTHORITY:-https://9lcinu.logto.app/oidc}"
  export OIDC_AUDIENCE="${OIDC_AUDIENCE:-https://api.mcad.local}"

  export AUTHZ_BASE_URL="${AUTHZ_BASE_URL:-${DEV_AUTHZ_BASE_URL:-https://mcad-authz.tasso.dev.br}}"
  export AUTHZ_UPSTREAM_BASE_URL="${AUTHZ_UPSTREAM_BASE_URL:-${DEV_AUTHZ_UPSTREAM_BASE_URL:-https://mcad-authz.tasso.dev.br/v1}}"
  export ECAD_AUTHZ_BASE_URL="${ECAD_AUTHZ_BASE_URL:-$AUTHZ_BASE_URL}"
  export AUTHZ_TIMEOUT_MS="${AUTHZ_TIMEOUT_MS:-3000}"
  export AUTHZ_TIMEOUT_SECONDS="${AUTHZ_TIMEOUT_SECONDS:-3}"
  export AUTHZ_CACHE_TTL_SECONDS="${AUTHZ_CACHE_TTL_SECONDS:-60}"

  export MINIO_ENDPOINT="${MINIO_ENDPOINT:-https://minio-api.tasso.dev.br}"
  export ISWC_BASE_URL="${ISWC_BASE_URL:-https://iswc.tasso.dev.br/}"

  parse_rabbitmq_url
  export RABBITMQ_VHOST="${RABBITMQ_VHOST:-mcad}"
  export OUTBOX_POLL_INTERVAL_SECONDS="${OUTBOX_POLL_INTERVAL_SECONDS:-5}"

  export CADASTRO_API_BASE_URL
  CADASTRO_API_BASE_URL="$(upstream_url_for cadastro-api "${selected[@]}")"
  export IDENTIFICACAO_API_BASE_URL
  IDENTIFICACAO_API_BASE_URL="$(upstream_url_for identificacao-api "${selected[@]}")"
  export ARRECADACAO_API_BASE_URL
  ARRECADACAO_API_BASE_URL="$(upstream_url_for arrecadacao-api "${selected[@]}")"
  export DISTRIBUICAO_API_BASE_URL
  DISTRIBUICAO_API_BASE_URL="$(upstream_url_for distribuicao-api "${selected[@]}")"
  export AI_ORCHESTRATOR_BASE_URL
  AI_ORCHESTRATOR_BASE_URL="$(upstream_url_for ai-orchestrator "${selected[@]}")"

  export AUDITORIA_API_BASE_URL="${AUDITORIA_API_BASE_URL:-https://api-audit.tasso.dev.br/api/v1}"
  export AUDIT_BASE_URL="${AUDIT_BASE_URL:-$AUDITORIA_API_BASE_URL}"

  export BFF_PORT="${BFF_PORT:-5200}"
  export BFF_HOST="${BFF_HOST:-0.0.0.0}"
  export BFF_CORS_ALLOWED_ORIGINS="${BFF_CORS_ALLOWED_ORIGINS:-http://localhost:5173,https://mcad.tasso.dev.br}"
  export FRONTEND_PORT="${FRONTEND_PORT:-5173}"
  export FRONTEND_STRICT_PORT="${FRONTEND_STRICT_PORT:-true}"

  if contains bff "${selected[@]}"; then
    export VITE_BFF_PROXY_TARGET="${VITE_BFF_PROXY_TARGET:-http://localhost:5200}"
  else
    export VITE_BFF_PROXY_TARGET="${VITE_BFF_PROXY_TARGET:-$(remote_url_for bff)}"
  fi

  export IDENTITY_SYNC_PORT="${IDENTITY_SYNC_PORT:-5301}"
  export IDENTITY_SYNC_HOST="${IDENTITY_SYNC_HOST:-0.0.0.0}"
}

configure_db_env() {
  local db_mode="${MCAD_DB_MODE:-ssh-tunnel}"

  case "$db_mode" in
    ssh-tunnel)
      local db_host="${MCAD_DB_LOCAL_HOST:-127.0.0.1}"
      local db_port="${MCAD_DB_LOCAL_PORT:-15432}"
      local db_name="${MCAD_DEV_DB_NAME:-mcad}"

      export CADASTRO_DB_HOST="$db_host"
      export CADASTRO_DB_PORT="$db_port"
      export CADASTRO_DB_NAME="$db_name"
      export CADASTRO_DB_SCHEMA="${CADASTRO_DB_SCHEMA:-cadastro}"

      export IDENTIFICACAO_DB_HOST="$db_host"
      export IDENTIFICACAO_DB_PORT="$db_port"
      export IDENTIFICACAO_DB_NAME="$db_name"
      export IDENTIFICACAO_DB_SCHEMA="${IDENTIFICACAO_DB_SCHEMA:-identificacao}"

      export ARRECADACAO_DB_HOST="$db_host"
      export ARRECADACAO_DB_PORT="$db_port"
      export ARRECADACAO_DB_NAME="$db_name"
      export ARRECADACAO_DB_SCHEMA="${ARRECADACAO_DB_SCHEMA:-arrecadacao}"

      export DB_HOST="$db_host"
      export DB_PORT="$db_port"
      export DB_NAME="$db_name"
      export DB_SCHEMA_DISTRIBUICAO="${DB_SCHEMA_DISTRIBUICAO:-distribuicao}"
      ;;
    direct)
      export DB_HOST="${DB_HOST:-${AIVEN_DB_HOST:-${CADASTRO_DB_HOST:-localhost}}}"
      export DB_PORT="${DB_PORT:-${AIVEN_DB_PORT:-${CADASTRO_DB_PORT:-5432}}}"
      export DB_NAME="${DB_NAME:-${AIVEN_DB_NAME:-${CADASTRO_DB_NAME:-mcad}}}"
      ;;
    local-compose)
      export CADASTRO_DB_HOST="${CADASTRO_DB_HOST:-localhost}"
      export CADASTRO_DB_PORT="${CADASTRO_DB_PORT:-5432}"
      export CADASTRO_DB_NAME="${CADASTRO_DB_NAME:-mcad}"
      export IDENTIFICACAO_DB_HOST="${IDENTIFICACAO_DB_HOST:-localhost}"
      export IDENTIFICACAO_DB_PORT="${IDENTIFICACAO_DB_PORT:-5432}"
      export IDENTIFICACAO_DB_NAME="${IDENTIFICACAO_DB_NAME:-mcad}"
      export ARRECADACAO_DB_HOST="${ARRECADACAO_DB_HOST:-localhost}"
      export ARRECADACAO_DB_PORT="${ARRECADACAO_DB_PORT:-5432}"
      export ARRECADACAO_DB_NAME="${ARRECADACAO_DB_NAME:-mcad}"
      export DB_HOST="${DB_HOST:-localhost}"
      export DB_PORT="${DB_PORT:-5432}"
      export DB_NAME="${DB_NAME:-mcad}"
      ;;
    *)
      error "MCAD_DB_MODE invalido: $db_mode"
      exit 2
      ;;
  esac
}

port_in_use() {
  local port="$1"
  local port_hex
  port_hex="$(printf '%04X' "$port")"

  awk -v port_suffix=":$port_hex" '
    $2 ~ port_suffix "$" && $4 == "0A" { found = 1 }
    END { exit found ? 0 : 1 }
  ' /proc/net/tcp /proc/net/tcp6 2>/dev/null
}

choose_db_tunnel_port() {
  [[ "${MCAD_DB_MODE:-ssh-tunnel}" != "ssh-tunnel" ]] && return 0
  [[ -n "${MCAD_DB_LOCAL_PORT:-}" ]] && return 0

  local port
  for port in $(seq 15432 15442); do
    if ! port_in_use "$port"; then
      export MCAD_DB_LOCAL_PORT="$port"
      return 0
    fi
  done

  error "Nenhuma porta livre encontrada para o tunel Postgres entre 15432 e 15442."
  exit 1
}

start_db_tunnel() {
  if is_running db-tunnel; then
    success "db-tunnel ja esta em execucao (pid $(read_pid db-tunnel))."
    return 0
  fi

  local ssh_host="${MCAD_DB_SSH_HOST:-mcad-server}"
  local remote_host="${MCAD_DB_REMOTE_HOST:-shared-postgres}"
  local remote_port="${MCAD_DB_REMOTE_PORT:-5432}"
  local local_host="${MCAD_DB_LOCAL_HOST:-127.0.0.1}"
  local local_port="${MCAD_DB_LOCAL_PORT:-15432}"

  if [[ -n "${MCAD_DB_SSH_ALIAS:-}" && -z "${MCAD_DB_SSH_HOST:-}" ]]; then
    info "Abrindo tunel SSH do Postgres via alias '$MCAD_DB_SSH_ALIAS'..."
    (
      setsid nohup ssh -o ExitOnForwardFailure=yes -N "$MCAD_DB_SSH_ALIAS" </dev/null >>"$LOGS_DIR/db-tunnel.log" 2>&1 &
      save_pid db-tunnel $!
    )
  else
    info "Abrindo tunel SSH do Postgres em ${local_host}:${local_port} -> ${remote_host}:${remote_port} via '$ssh_host'..."
    (
      setsid nohup ssh -o ExitOnForwardFailure=yes -N -L "${local_host}:${local_port}:${remote_host}:${remote_port}" "$ssh_host" </dev/null >>"$LOGS_DIR/db-tunnel.log" 2>&1 &
      save_pid db-tunnel $!
    )
  fi

  sleep 1

  if ! is_running db-tunnel; then
    error "Falha ao abrir tunel SSH. Veja $LOGS_DIR/db-tunnel.log"
    exit 1
  fi

  success "db-tunnel ativo em localhost:${MCAD_DB_LOCAL_PORT:-15432}."
}

start_process() {
  local name="$1"
  local workdir="$2"
  shift 2

  if is_running "$name"; then
    success "$name ja esta em execucao (pid $(read_pid "$name"))."
    return 0
  fi

  info "Iniciando $name..."

  (
    cd "$workdir"
    setsid nohup "$@" </dev/null >>"$LOGS_DIR/$name.log" 2>&1 &
    save_pid "$name" $!
  )

  sleep 1

  if is_running "$name"; then
    success "$name iniciado (pid $(read_pid "$name")). Log: .tmp/logs/$name.log"
  else
    error "$name falhou ao iniciar. Veja $LOGS_DIR/$name.log"
    exit 1
  fi
}

json_escape() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  printf '%s' "$value"
}

prepare_frontend_runtime_env() {
  local runtime_file="$ROOT_DIR/frontend/public/runtime-env.js"

  {
    printf 'window.RUNTIME_ENV = {\n'
    printf '  CADASTRO_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_CADASTRO_API_BASE_URL:-/api/cadastro/v1}")"
    printf '  IDENTIFICACAO_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_IDENTIFICACAO_API_BASE_URL:-/api/identificacao/v1}")"
    printf '  ARRECADACAO_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_ARRECADACAO_API_BASE_URL:-/api/arrecadacao/v1}")"
    printf '  DISTRIBUICAO_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_DISTRIBUICAO_API_BASE_URL:-/api/distribuicao/v1}")"
    printf '  AUDITORIA_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_AUDITORIA_API_BASE_URL:-/api/auditoria/v1}")"
    printf '  AUTHZ_API_BASE_URL: "%s",\n' "$(json_escape "${FRONTEND_AUTHZ_API_BASE_URL:-/api/authz/v1}")"
    printf '  OIDC_AUTHORITY: "%s",\n' "$(json_escape "${OIDC_AUTHORITY:-}")"
    printf '  OIDC_CLIENT_ID: "%s",\n' "$(json_escape "${OIDC_CLIENT_ID:-mcad-frontend}")"
    printf '  OIDC_AUDIENCE: "%s",\n' "$(json_escape "${OIDC_AUDIENCE:-}")"
    printf '  OIDC_REDIRECT_URI: "%s",\n' "$(json_escape "${OIDC_REDIRECT_URI:-http://localhost:${FRONTEND_PORT:-5173}/callback}")"
    printf '  OIDC_POST_LOGOUT_REDIRECT_URI: "%s"\n' "$(json_escape "${OIDC_POST_LOGOUT_REDIRECT_URI:-http://localhost:${FRONTEND_PORT:-5173}/logout}")"
    printf '};\n'
  } >"$runtime_file"
}

start_service() {
  local service="$1"

  case "$service" in
    db-tunnel)
      start_db_tunnel
      ;;
    cadastro-api)
      start_process cadastro-api "$ROOT_DIR/services/cadastro-api/1-Services/Cadastro.API" dotnet run --launch-profile http
      ;;
    identificacao-api)
      start_process identificacao-api "$ROOT_DIR/services/identificacao-api/1-Services/Identificacao.API" dotnet run --launch-profile http
      ;;
    arrecadacao-api)
      start_process arrecadacao-api "$ROOT_DIR/services/arrecadacao-api" mvn -pl arrecadacao-api spring-boot:run -Dspring-boot.run.profiles=dev
      ;;
    distribuicao-api)
      start_process distribuicao-api "$ROOT_DIR/services/distribuicao-api" mvn -pl distribuicao-api spring-boot:run -Dspring-boot.run.profiles=dev
      ;;
    ai-orchestrator)
      start_process ai-orchestrator "$ROOT_DIR/services/ai-orchestrator" npm run dev
      ;;
    bff)
      start_process bff "$ROOT_DIR/services/bff" npm run dev
      ;;
    identity-sync-api)
      start_process identity-sync-api "$ROOT_DIR/services/identity-sync-api" npm run dev
      ;;
    frontend)
      prepare_frontend_runtime_env
      start_process frontend "$ROOT_DIR/frontend" npm run dev
      ;;
  esac
}

stop_service() {
  local name="$1"
  local pid
  pid="$(read_pid "$name")"

  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    warn "$name nao esta em execucao."
    rm -f "$(pid_file "$name")"
    return 0
  fi

  info "Parando $name (pid $pid)..."
  kill "$pid" 2>/dev/null || true

  local i=0
  while kill -0 "$pid" 2>/dev/null && [[ "$i" -lt 15 ]]; do
    sleep 1
    i=$((i + 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    warn "$name nao parou com SIGTERM; enviando SIGKILL."
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$(pid_file "$name")"
  success "$name parado."
}

cmd_up() {
  load_env
  mapfile -t selected < <(expand_targets "$@")

  choose_db_tunnel_port
  configure_common_env "${selected[@]}"
  configure_db_env

  info "Modo DB: ${MCAD_DB_MODE:-ssh-tunnel}; Logto/RabbitMQ/Redis: cloud/dev por env."
  info "Servicos: ${selected[*]}"

  for service in "${START_ORDER[@]}"; do
    if contains "$service" "${selected[@]}"; then
      start_service "$service"
    fi
  done

  echo ""
  success "Ambiente iniciado."
  print_urls "${selected[@]}"
}

cmd_down() {
  local targets=("$@")

  if [[ "${#targets[@]}" -eq 0 ]]; then
    targets=("${START_ORDER[@]}")
  else
    mapfile -t targets < <(expand_targets "${targets[@]}")
  fi

  local i
  for ((i = ${#START_ORDER[@]} - 1; i >= 0; i--)); do
    if contains "${START_ORDER[$i]}" "${targets[@]}"; then
      stop_service "${START_ORDER[$i]}"
    fi
  done
}

cmd_status() {
  local service pid

  for service in "${START_ORDER[@]}"; do
    pid="$(read_pid "$service")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "$service: running (pid $pid)"
    else
      echo "$service: stopped"
    fi
  done
}

cmd_logs() {
  local service="${1:-}"

  if [[ -z "$service" ]]; then
    info "Logs disponiveis em $LOGS_DIR"
    ls -1 "$LOGS_DIR" 2>/dev/null || true
    return 0
  fi

  validate_service "$service"
  local log_file="$LOGS_DIR/$service.log"

  if [[ ! -f "$log_file" ]]; then
    error "Log nao encontrado: $log_file"
    exit 1
  fi

  tail -f "$log_file"
}

print_urls() {
  local selected=("$@")

  if contains cadastro-api "${selected[@]}"; then echo "  cadastro-api      http://localhost:5001"; fi
  if contains identificacao-api "${selected[@]}"; then echo "  identificacao-api http://localhost:5100"; fi
  if contains arrecadacao-api "${selected[@]}"; then echo "  arrecadacao-api   http://localhost:5003"; fi
  if contains distribuicao-api "${selected[@]}"; then echo "  distribuicao-api  http://localhost:5004"; fi
  if contains ai-orchestrator "${selected[@]}"; then echo "  ai-orchestrator   http://localhost:5300"; fi
  if contains bff "${selected[@]}"; then echo "  bff               http://localhost:5200"; fi
  if contains identity-sync-api "${selected[@]}"; then echo "  identity-sync-api http://localhost:${IDENTITY_SYNC_PORT:-5301}"; fi
  if contains frontend "${selected[@]}"; then echo "  frontend          http://localhost:${FRONTEND_PORT:-5173}"; fi
  if contains db-tunnel "${selected[@]}"; then echo "  db-tunnel         localhost:${MCAD_DB_LOCAL_PORT:-15432} -> ${MCAD_DB_REMOTE_HOST:-shared-postgres}:${MCAD_DB_REMOTE_PORT:-5432}"; fi

  return 0
}

main() {
  local command="${1:-}"
  shift || true

  case "$command" in
    up|start)
      cmd_up "$@"
      ;;
    down|stop)
      cmd_down "$@"
      ;;
    restart)
      cmd_down "$@"
      cmd_up "$@"
      ;;
    status)
      cmd_status
      ;;
    logs)
      cmd_logs "$@"
      ;;
    help|-h|--help|"")
      usage
      ;;
    *)
      error "Comando desconhecido: $command"
      usage
      exit 2
      ;;
  esac
}

main "$@"
