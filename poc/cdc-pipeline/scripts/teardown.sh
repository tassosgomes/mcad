#!/bin/bash
# =============================================================================
# Teardown: Remove connectors, limpa dados de teste
# =============================================================================

set -euo pipefail

CONNECT_URL="http://localhost:8083"
LEGADO_CONN="postgresql://ecad_user:ecad_pass@localhost:5433/ecad_legado"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "========================================="
echo "  CDC Pipeline — Teardown"
echo "========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Remove connectors
# ---------------------------------------------------------------------------
warn "Removendo connectors..."
curl -sf -X DELETE "${CONNECT_URL}/connectors/ecad-legado-source" > /dev/null 2>&1 && log "Source removido" || warn "Source não encontrado"
curl -sf -X DELETE "${CONNECT_URL}/connectors/mcad-sink-entidades" > /dev/null 2>&1 && log "Sink entidades removido" || warn "Sink entidades não encontrado"
curl -sf -X DELETE "${CONNECT_URL}/connectors/mcad-sink-junctions" > /dev/null 2>&1 && log "Sink junctions removido" || warn "Sink junctions não encontrado"

# ---------------------------------------------------------------------------
# 2. Limpa dados de teste no legado
# ---------------------------------------------------------------------------
warn "Limpando dados de teste no legado..."
psql "$LEGADO_CONN" -q <<'SQL' 2>/dev/null || true
DELETE FROM ecad_legado.tb_titularidade WHERE cd_obra = 5099;
DELETE FROM ecad_legado.tb_obra WHERE cd_obra = 5099;
DELETE FROM ecad_legado.tb_titular WHERE cd_titular = 1099;
SQL
log "Dados de teste removidos"

echo ""
log "Teardown completo. Para parar containers: docker compose down"
echo ""
