#!/usr/bin/env bash
# dev.sh — Inicia ou para toda a stack de desenvolvimento do mcad
# Uso: ./dev.sh [start|stop]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$ROOT_DIR/.tmp/logs"
PID_DIR="$ROOT_DIR/.tmp/pids"

mkdir -p "$LOGS_DIR" "$PID_DIR"

# ── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[mcad]${NC} $*"; }
success() { echo -e "${GREEN}[mcad]${NC} $*"; }
warn()    { echo -e "${YELLOW}[mcad]${NC} $*"; }
error()   { echo -e "${RED}[mcad]${NC} $*" >&2; }

# ── Helpers ──────────────────────────────────────────────────────────────────
save_pid() { echo "$2" > "$PID_DIR/$1.pid"; }
read_pid() { cat "$PID_DIR/$1.pid" 2>/dev/null || echo ""; }

kill_service() {
  local name="$1"
  local pid
  pid=$(read_pid "$name")
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    info "Parando $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    # Aguarda até 10s
    local i=0
    while kill -0 "$pid" 2>/dev/null && [[ $i -lt 10 ]]; do
      sleep 1; ((i++))
    done
    kill -9 "$pid" 2>/dev/null || true
    success "$name parado."
  else
    warn "$name não estava em execução (ou pid não encontrado)."
  fi
  rm -f "$PID_DIR/$name.pid"
}

# ── Carrega .env como variáveis de ambiente ──────────────────────────────────
load_env() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

# ── Start ────────────────────────────────────────────────────────────────────
cmd_start() {
  info "Infraestrutura remota (db/rabbitmq/keycloak/minio em tasso.dev.br)"

  # cadastro-api (.NET — porta 5001)
  info "Iniciando cadastro-api  → http://localhost:5001"
  (
    cd "$ROOT_DIR/services/cadastro-api/1-Services/Cadastro.API"
    dotnet run --launch-profile http \
      >> "$LOGS_DIR/cadastro-api.log" 2>&1
  ) &
  save_pid "cadastro-api" $!

  # identificacao-api (.NET — porta 5100)
  info "Iniciando identificacao-api → http://localhost:5100"
  (
    cd "$ROOT_DIR/services/identificacao-api/1-Services/Identificacao.API"
    dotnet run --launch-profile http \
      >> "$LOGS_DIR/identificacao-api.log" 2>&1
  ) &
  save_pid "identificacao-api" $!

  # arrecadacao-api (Java/Maven — porta 5003)
  info "Iniciando arrecadacao-api  → http://localhost:5003"
  (
    cd "$ROOT_DIR/services/arrecadacao-api"
    load_env "$ROOT_DIR/services/arrecadacao-api/.env"
    mvn -pl arrecadacao-api spring-boot:run -Dspring-boot.run.profiles=dev \
      >> "$LOGS_DIR/arrecadacao-api.log" 2>&1
  ) &
  save_pid "arrecadacao-api" $!

  # frontend (Vite — porta 5173)
  info "Iniciando frontend          → http://localhost:5173"
  (
    cd "$ROOT_DIR/frontend"
    npm run dev \
      >> "$LOGS_DIR/frontend.log" 2>&1
  ) &
  save_pid "frontend" $!

  echo ""
  success "Stack iniciada. Logs em .tmp/logs/"
  echo -e "  cadastro-api      → http://localhost:5001"
  echo -e "  identificacao-api → http://localhost:5100"
  echo -e "  arrecadacao-api   → http://localhost:5003"
  echo -e "  frontend          → http://localhost:5173"
  echo ""
  echo -e "  Para parar: ${YELLOW}./dev.sh stop${NC}"
}

# ── Stop ─────────────────────────────────────────────────────────────────────
cmd_stop() {
  kill_service "frontend"
  kill_service "arrecadacao-api"
  kill_service "identificacao-api"
  kill_service "cadastro-api"

  success "Stack encerrada."
}

# ── Main ─────────────────────────────────────────────────────────────────────
case "${1:-}" in
  start) cmd_start ;;
  stop)  cmd_stop  ;;
  *)
    echo "Uso: $0 {start|stop}"
    exit 1
    ;;
esac
