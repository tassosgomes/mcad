#!/usr/bin/env bash
# ============================================================================
# Setup/Teardown de Fixtures — QA Task 04 (CT-03 e CT-04c)
# ============================================================================
# Uso:
#   ./setup-fixtures.sh          # cria as fixtures
#   ./setup-fixtures.sh --clean  # remove as fixtures
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/fixtures.sql"

# --- Detecção de conexão PostgreSQL ---------------------------------------
# Prioridade: PGPASSWORD+PGHOST explícitos → túnel SSH (dev.sh) → erro
if [[ -z "${PGHOST:-}" ]]; then
  if [[ -n "${IDENTIFICACAO_DB_HOST:-}" ]]; then
    export PGHOST="${IDENTIFICACAO_DB_HOST}"
    export PGPORT="${IDENTIFICACAO_DB_PORT:-5432}"
    export PGDATABASE="${IDENTIFICACAO_DB_NAME:-mcad}"
    export PGUSER="${IDENTIFICACAO_DB_USER}"
    export PGPASSWORD="${IDENTIFICACAO_DB_PASSWORD}"
  elif pg_isready -h localhost -p 15432 -q 2>/dev/null; then
    export PGHOST=localhost PGPORT=15432
    export PGDATABASE="${IDENTIFICACAO_DB_NAME:-mcad}"
    export PGUSER="${IDENTIFICACAO_DB_USER:-identificacao_svc}"
  else
    echo "ERRO: Defina PGHOST/PGUSER/PGPASSWORD ou inicie o túnel (./dev.sh start identificacao-api)"
    exit 1
  fi
fi

CLEAN=false
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=true
fi

if $CLEAN; then
  echo "→ Removendo fixtures CT-03/CT-04c..."
  psql -v ON_ERROR_STOP=1 <<'SQL'
DELETE FROM "identificacao"."Execucoes"
  WHERE "CaptacaoId" = 'a4f5e6d7-0002-4000-8000-000000000002';
DELETE FROM "identificacao"."Captacoes"
  WHERE "Id" IN (
    'a4f5e6d7-0001-4000-8000-000000000001',
    'a4f5e6d7-0002-4000-8000-000000000002'
  );
SQL
  echo "✓ Fixtures removidas."
else
  echo "→ Criando fixtures CT-03/CT-04c..."
  psql -v ON_ERROR_STOP=1 -f "$SQL_FILE"
  echo ""
  echo "✓ Fixtures criadas. IDs:"
  echo "  F_FECHADA  = a4f5e6d7-0001-4000-8000-000000000001 (RADIO 2026-07-15, Fechada)"
  echo "  F_COM_EXEC = a4f5e6d7-0002-4000-8000-000000000002 (STREAMING_AUDIO 2026-07-16, Aberta + 1 execução)"
fi
