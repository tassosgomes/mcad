#!/bin/bash
# =============================================================================
# Verificação: Compara dados no legado vs staging vs cadastro
# =============================================================================

set -euo pipefail

LEGADO_CONN="postgresql://ecad_user:ecad_pass@localhost:5433/ecad_legado"
MCAD_CONN="postgresql://cadastro_svc:cadastro_svc@localhost:5432/mcad"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

PASS=0
FAIL=0

check() {
    local desc="$1"
    local q_legado="$2"
    local q_staging="$3"
    local q_cadastro="$4"

    C_LEGADO=$(psql "$LEGADO_CONN" -tAc "$q_legado" 2>/dev/null || echo "ERR")
    C_STAGING=$(psql "$MCAD_CONN" -tAc "$q_staging" 2>/dev/null || echo "ERR")
    C_CADASTRO=$(psql "$MCAD_CONN" -tAc "$q_cadastro" 2>/dev/null || echo "ERR")

    if [ "$C_LEGADO" = "$C_STAGING" ] && [ "$C_STAGING" = "$C_CADASTRO" ]; then
        log "$desc — legado=$C_LEGADO, staging=$C_STAGING, cadastro=$C_CADASTRO"
        PASS=$((PASS + 1))
    elif [ "$C_LEGADO" = "$C_STAGING" ]; then
        warn "$desc — legado=$C_LEGADO, staging=$C_STAGING, cadastro=$C_CADASTRO (sync pendente?)"
        FAIL=$((FAIL + 1))
    else
        err "$desc — legado=$C_LEGADO, staging=$C_STAGING, cadastro=$C_CADASTRO"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "========================================="
echo "  CDC Pipeline — Verificação (3 camadas)"
echo "========================================="
echo ""

# ---------------------------------------------------------------------------
# Contagem: legado vs staging vs cadastro
# ---------------------------------------------------------------------------
info "Comparando contagens: legado → staging → cadastro"
echo ""

check "Associações" \
    "SELECT COUNT(*) FROM ecad_legado.tb_associacao" \
    "SELECT COUNT(*) FROM cdc_staging.associacoes" \
    "SELECT COUNT(*) FROM cadastro.associacoes"

check "Titulares" \
    "SELECT COUNT(*) FROM ecad_legado.tb_titular" \
    "SELECT COUNT(*) FROM cdc_staging.titulares" \
    "SELECT COUNT(*) FROM cadastro.titulares"

check "Obras Musicais" \
    "SELECT COUNT(*) FROM ecad_legado.tb_obra" \
    "SELECT COUNT(*) FROM cdc_staging.obras_musicais" \
    "SELECT COUNT(*) FROM cadastro.obras_musicais"

check "Titularidades" \
    "SELECT COUNT(*) FROM ecad_legado.tb_titularidade" \
    "SELECT COUNT(*) FROM cdc_staging.titularidades_autorais" \
    "SELECT COUNT(*) FROM cadastro.titularidades_autorais"

check "Fonogramas" \
    "SELECT COUNT(*) FROM ecad_legado.tb_fonograma" \
    "SELECT COUNT(*) FROM cdc_staging.fonogramas" \
    "SELECT COUNT(*) FROM cadastro.fonogramas"

check "Participações" \
    "SELECT COUNT(*) FROM ecad_legado.tb_participacao" \
    "SELECT COUNT(*) FROM cdc_staging.participacoes_conexas" \
    "SELECT COUNT(*) FROM cadastro.participacoes_conexas"

check "Histórico Bloqueios" \
    "SELECT COUNT(*) FROM ecad_legado.tb_historico_bloqueio" \
    "SELECT COUNT(*) FROM cdc_staging.historico_bloqueios" \
    "SELECT COUNT(*) FROM cadastro.historico_bloqueios"

# ---------------------------------------------------------------------------
# Verificação de transformação
# ---------------------------------------------------------------------------
echo ""
info "Verificando transformações de dados..."
echo ""

# Staging: titular teste existe com dados transformados?
STAGING_TITULAR=$(psql "$MCAD_CONN" -tAc "SELECT nome || '|' || tipo || '|' || status FROM cdc_staging.titulares WHERE codigo = 1099" 2>/dev/null || echo "NOT_FOUND")
if echo "$STAGING_TITULAR" | grep -q "Teste CDC Pipeline|PF|FALECIDO"; then
    log "Staging: titular 1099 com transformações corretas ($STAGING_TITULAR)"
    PASS=$((PASS + 1))
else
    err "Staging: titular 1099 ($STAGING_TITULAR)"
    FAIL=$((FAIL + 1))
fi

# Cadastro: titular teste com FK UUID resolvida?
CADASTRO_TITULAR=$(psql "$MCAD_CONN" -tAc "
    SELECT t.nome || '|' || t.tipo || '|' || t.status || '|codigo=' || t.codigo || '|assoc=' || a.sigla
    FROM cadastro.titulares t
    JOIN cadastro.associacoes a ON a.id = t.associacao_id
    WHERE t.codigo = 1099
" 2>/dev/null || echo "NOT_FOUND")
if echo "$CADASTRO_TITULAR" | grep -q "Teste CDC Pipeline.*ABRAMUS"; then
    log "Cadastro: titular 1099 com FK resolvida ($CADASTRO_TITULAR)"
    PASS=$((PASS + 1))
else
    err "Cadastro: titular 1099 ($CADASTRO_TITULAR)"
    FAIL=$((FAIL + 1))
fi

# Cadastro: obra teste existe?
CADASTRO_OBRA=$(psql "$MCAD_CONN" -tAc "
    SELECT titulo || '|' || tipo || '|' || status || '|codigo=' || codigo
    FROM cadastro.obras_musicais
    WHERE codigo = 5099
" 2>/dev/null || echo "NOT_FOUND")
if echo "$CADASTRO_OBRA" | grep -q "Música Teste CDC|MUSICAL|LIBERADO|codigo=5099"; then
    log "Cadastro: obra 5099 ($CADASTRO_OBRA)"
    PASS=$((PASS + 1))
else
    err "Cadastro: obra 5099 ($CADASTRO_OBRA)"
    FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------
TOTAL=$((PASS + FAIL))
echo ""
echo "========================================="
if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}RESULTADO: ${PASS}/${TOTAL} checks passed${NC}"
else
    echo -e "  ${RED}RESULTADO: ${PASS} passed, ${FAIL} failed (de ${TOTAL})${NC}"
fi
echo "========================================="
echo ""
