#!/bin/bash
# =============================================================================
# Teste: Insere/atualiza no legado e sincroniza via staging → cadastro
# =============================================================================

set -euo pipefail

LEGADO_CONN="postgresql://ecad_user:ecad_pass@localhost:5433/ecad_legado"
MCAD_CONN="postgresql://cadastro_svc:cadastro_svc@localhost:5432/mcad"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "========================================="
echo "  CDC Pipeline — Teste de Propagação"
echo "========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. INSERT — Novo titular
# ---------------------------------------------------------------------------
warn "1/4 — INSERT: Criando novo titular no legado..."

psql "$LEGADO_CONN" -q <<'SQL'
INSERT INTO ecad_legado.TB_TITULAR
    (CD_TITULAR, NM_TITULAR, NR_TIPO_PESSOA, NR_CPF, NM_NACIONALIDADE, CD_ASSOCIACAO, NM_ASSOCIACAO, SG_ASSOCIACAO, NR_STATUS)
VALUES
    (1099, 'Teste CDC Pipeline', 1, '00011122233', 'Brasileira', 1, 'Associação Brasileira de Música e Artes', 'ABRAMUS', 1);
SQL
log "Titular CD_TITULAR=1099 inserido"

# ---------------------------------------------------------------------------
# 2. INSERT — Nova obra
# ---------------------------------------------------------------------------
warn "2/4 — INSERT: Criando nova obra no legado..."

psql "$LEGADO_CONN" -q <<'SQL'
INSERT INTO ecad_legado.TB_OBRA
    (CD_OBRA, NM_OBRA, NR_TIPO_OBRA, NM_GENERO, NR_STATUS, IN_DOMINIO_PUBLICO)
VALUES
    (5099, 'Música Teste CDC', 1, 'Pop', 2, 'N');
SQL
log "Obra CD_OBRA=5099 inserida"

# ---------------------------------------------------------------------------
# 3. UPDATE — Alterar status do titular
# ---------------------------------------------------------------------------
warn "3/4 — UPDATE: Alterando status do titular..."

psql "$LEGADO_CONN" -q <<'SQL'
UPDATE ecad_legado.TB_TITULAR
SET NR_STATUS = 2, DT_ALTERACAO = CURRENT_DATE
WHERE CD_TITULAR = 1099;
SQL
log "Titular CD_TITULAR=1099 atualizado para status=2 (Falecido)"

# ---------------------------------------------------------------------------
# 4. INSERT — Titularidade (junction)
# ---------------------------------------------------------------------------
warn "4/4 — INSERT: Criando titularidade (junction)..."

psql "$LEGADO_CONN" -q <<'SQL'
INSERT INTO ecad_legado.TB_TITULARIDADE
    (CD_OBRA, CD_TITULAR, NR_CATEGORIA, VL_PERCENTUAL)
VALUES
    (5099, 1099, 1, 100.0000);
SQL
log "Titularidade (5099, 1099, AUTOR) inserida"

# ---------------------------------------------------------------------------
# 5. Aguardar propagação CDC → Sink → Staging
# ---------------------------------------------------------------------------
echo ""
warn "Aguardando propagação CDC (10s)..."
sleep 10

# ---------------------------------------------------------------------------
# 6. Executar sync: staging → cadastro
# ---------------------------------------------------------------------------
warn "Executando sync: staging → cadastro..."
psql "$MCAD_CONN" -c "CALL cdc_staging.sync_to_cadastro();" -q 2>/dev/null && \
    log "Sync executado" || \
    echo -e "${RED}[✗]${NC} Falha no sync (tabelas cadastro.* precisam da coluna 'codigo')"

# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "  Operações completas!"
echo "========================================="
echo ""
echo "  Execute: ./scripts/verify-sync.sh"
echo ""
