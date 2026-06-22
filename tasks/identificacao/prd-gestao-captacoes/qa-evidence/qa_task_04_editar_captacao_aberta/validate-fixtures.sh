#!/usr/bin/env bash
# ============================================================================
# Validação das Fixtures CT-03 e CT-04c via API
# ============================================================================
# Pré-requisitos:
#   • identificacao-api rodando (./dev.sh start identificacao-api)
#   • Fixtures aplicadas (./setup-fixtures.sh)
#   • Token JWT válido (export TOKEN=...)
#
# Uso:
#   export TOKEN="<seu-jwt-aqui>"
#   ./validate-fixtures.sh
# ============================================================================
set -euo pipefail

API="http://localhost:5100/api/v1"
TOKEN="${TOKEN:?Defina TOKEN com um JWT válido do Logto}"

F_FECHADA="a4f5e6d7-0001-4000-8000-000000000001"
F_COM_EXEC="a4f5e6d7-0002-4000-8000-000000000002"

pass=0; fail=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  ✅ $desc (HTTP $actual)"
    ((pass++))
  else
    echo "  ❌ $desc — esperado $expected, recebido $actual"
    ((fail++))
  fi
}

echo "=== CT-03: PUT em captação FECHADA → 422 STATUS_INVALIDO ==="
HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/captacoes/$F_FECHADA" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rubricaId":"b1a2c3d4-0001-0000-0000-000000000001","periodo":"2026-07-15","usuarioMusicaId":"44444444-4444-4444-4444-444444444444","usuarioMusicaNome":"QA-F04-Fixture-Fechada"}')
check "PUT em FECHADA bloqueado" "422" "$HTTP"

echo ""
echo "=== CT-04c: Mudar rubrica COM execuções → 409 RUBRICA_BLOQUEADA ==="
HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/captacoes/$F_COM_EXEC" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rubricaId":"b1a2c3d4-0001-0000-0000-000000000001","periodo":"2026-07-16","usuarioMusicaId":"44444444-4444-4444-4444-444444444444","usuarioMusicaNome":"QA-F04-Fixture-ComExec"}')
check "Mudar rubrica com execuções bloqueado" "409" "$HTTP"

echo ""
echo "=== CT-06 (regressão): RN-08 não-dono → 403 FORBIDDEN ==="
HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/captacoes/$F_COM_EXEC" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rubricaId":"b1a2c3d4-0001-0000-0000-000000000006","periodo":"2026-07-16","usuarioMusicaId":"44444444-4444-4444-4444-444444444444","usuarioMusicaNome":"Tentativa nao-dono"}')
# Nota: este teste só passa se o TOKEN NÃO pertencer ao analista b51e719e
echo "  (HTTP $HTTP — esperado 403 se o token NÃO for do analista dono)"

echo ""
echo "==============================================="
echo "  Resultado: $pass pass, $fail fail"
echo "==============================================="
