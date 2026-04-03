#!/bin/bash
# =============================================================================
# Setup: Deploy connectors + ksqlDB transformations + staging tables
# Pré-requisito: docker compose up -d (stack rodando e healthy)
# =============================================================================

set -euo pipefail

CONNECT_URL="http://localhost:8083"
KSQLDB_URL="http://localhost:8088"
MCAD_CONN="postgresql://cadastro_svc:cadastro_svc@localhost:5432/mcad"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

deploy_connector() {
    local name="$1"
    local file="$2"

    # Remove existente (idempotência)
    curl -sf -X DELETE "${CONNECT_URL}/connectors/${name}" > /dev/null 2>&1 || true
    sleep 2

    HTTP_CODE=$(curl -s -o /tmp/connect_response.json -w "%{http_code}" \
        -X POST "${CONNECT_URL}/connectors" \
        -H "Content-Type: application/json" \
        -d @"${file}")

    if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
        log "Connector '${name}' criado"
    else
        err "Falha ao criar '${name}' (HTTP ${HTTP_CODE})"
        cat /tmp/connect_response.json 2>/dev/null | python3 -m json.tool 2>/dev/null || true
        return 1
    fi
}

check_connector() {
    local name="$1"
    STATUS=$(curl -sf "${CONNECT_URL}/connectors/${name}/status" \
        | python3 -c "import sys,json; print(json.load(sys.stdin)['connector']['state'])" 2>/dev/null || echo "UNKNOWN")
    if [ "$STATUS" = "RUNNING" ]; then
        log "Connector '${name}': RUNNING"
    else
        warn "Connector '${name}': ${STATUS}"
    fi
}

# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "  CDC Pipeline — Setup"
echo "========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Criar staging tables no mcad
# ---------------------------------------------------------------------------
warn "Criando staging tables no PostgreSQL mcad..."
psql "$MCAD_CONN" -f "${ROOT_DIR}/sink-db/01-staging-tables.sql" -q 2>/dev/null && \
    log "Staging tables criadas (schema cdc_staging)" || \
    err "Falha ao criar staging tables"

# ---------------------------------------------------------------------------
# 2. Aguardar Kafka Connect
# ---------------------------------------------------------------------------
warn "Aguardando Kafka Connect ficar healthy..."
for i in $(seq 1 60); do
    if curl -sf "${CONNECT_URL}/connectors" > /dev/null 2>&1; then
        log "Kafka Connect pronto!"
        break
    fi
    if [ "$i" -eq 60 ]; then
        err "Kafka Connect não respondeu após 60 tentativas"
        exit 1
    fi
    sleep 3
done

# ---------------------------------------------------------------------------
# 3. Deploy Source Connector (Debezium)
# ---------------------------------------------------------------------------
echo ""
warn "Deploying Source Connector (Debezium PostgreSQL)..."
deploy_connector "ecad-legado-source" "${ROOT_DIR}/connectors/source-debezium.json"

warn "Aguardando snapshot inicial (10s)..."
sleep 10
check_connector "ecad-legado-source"

# ---------------------------------------------------------------------------
# 4. Deploy ksqlDB Transformations
# ---------------------------------------------------------------------------
echo ""
warn "Aguardando ksqlDB ficar healthy..."
for i in $(seq 1 30); do
    if curl -sf "${KSQLDB_URL}/info" > /dev/null 2>&1; then
        log "ksqlDB pronto!"
        break
    fi
    if [ "$i" -eq 30 ]; then
        err "ksqlDB não respondeu após 30 tentativas"
        exit 1
    fi
    sleep 3
done

warn "Deploying ksqlDB transformations..."

STATEMENTS=()
while IFS= read -r line || [ -n "$line" ]; do
    STATEMENTS+=("$line")
done < <(
    sed 's/--.*$//' "${ROOT_DIR}/ksqldb/transforms.sql" | \
    tr '\n' ' ' | \
    sed 's/;/;\n/g' | \
    grep -v '^\s*$'
)

TOTAL=${#STATEMENTS[@]}
COUNT=0

for stmt in "${STATEMENTS[@]}"; do
    trimmed=$(echo "$stmt" | xargs)
    [ -z "$trimmed" ] && continue

    COUNT=$((COUNT + 1))
    STMT_TYPE=$(echo "$trimmed" | awk '{print $1, $2, $3}' | head -c 40)

    HTTP_CODE=$(curl -s -o /tmp/ksql_response.json -w "%{http_code}" \
        -X POST "${KSQLDB_URL}/ksql" \
        -H "Content-Type: application/vnd.ksql.v1+json" \
        -d "{\"ksql\": \"$(echo "$trimmed" | sed 's/"/\\"/g')\", \"streamsProperties\": {}}")

    if [ "$HTTP_CODE" -eq 200 ]; then
        log "[${COUNT}/${TOTAL}] ${STMT_TYPE}..."
    else
        warn "[${COUNT}/${TOTAL}] ${STMT_TYPE}... (HTTP ${HTTP_CODE})"
        cat /tmp/ksql_response.json 2>/dev/null | python3 -m json.tool 2>/dev/null || true
    fi
done

# ---------------------------------------------------------------------------
# 5. Deploy Sink Connectors (aguarda topics transformados)
# ---------------------------------------------------------------------------
echo ""
warn "Aguardando topics transformados (15s)..."
sleep 15

warn "Deploying Sink Connectors..."
deploy_connector "mcad-sink-entidades" "${ROOT_DIR}/connectors/sink-jdbc.json"
deploy_connector "mcad-sink-junctions" "${ROOT_DIR}/connectors/sink-jdbc-junctions.json"

sleep 5
check_connector "mcad-sink-entidades"
check_connector "mcad-sink-junctions"

# ---------------------------------------------------------------------------
# 6. Aguardar sink processar e executar sync procedure
# ---------------------------------------------------------------------------
echo ""
warn "Aguardando sink processar dados (10s)..."
sleep 10

warn "Executando sync: staging → cadastro..."
psql "$MCAD_CONN" -c "CALL cdc_staging.sync_to_cadastro();" -q 2>/dev/null && \
    log "Sync staging → cadastro executado" || \
    err "Falha no sync (verifique se as tabelas cadastro.* têm coluna 'codigo')"

# ---------------------------------------------------------------------------
# 7. Resumo
# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "  Setup Completo!"
echo "========================================="
echo ""
echo "  Kafka UI:       http://localhost:8080"
echo "  Kafka Connect:  http://localhost:8083/connectors"
echo "  ksqlDB:         http://localhost:8088"
echo "  PG Legado:      localhost:5433 (ecad_user/ecad_pass)"
echo "  PG mcad:        localhost:5432 (cadastro_svc/cadastro_svc)"
echo ""
echo "  Pipeline:  Legado → Debezium → Kafka → ksqlDB → Sink → cdc_staging"
echo "  Sync:      CALL cdc_staging.sync_to_cadastro()  (staging → cadastro)"
echo ""
echo "  Próximo:   ./scripts/test-insert.sh"
echo ""
