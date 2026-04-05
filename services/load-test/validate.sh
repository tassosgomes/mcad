#!/usr/bin/env bash
# validate.sh — Validação funcional: 1 VU × 5 minutos
#
# Pré-requisitos:
#   - cadastro-api rodando em localhost:5001 (dotnet run)
#   - keycloak rodando em localhost:8080
#   - docker disponível
#
# O script:
#   1. Inicia o mock ISWC local (porta 8090)
#   2. Reinicia o cadastro-api com ISWC_BASE_URL apontando para o mock
#   3. Aguarda a API ficar disponível
#   4. Executa o simulador k6 com 1 VU × 5 min
#   5. Para o mock ISWC
#   6. Exibe o sumário com resultado dos critérios de aceitação

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOCK_IMAGE="mcad-mock-iswc"
MOCK_CONTAINER="mcad-mock-iswc-validation"
SIM_IMAGE="mcad-simulador:validate"

API_BASE_URL="${API_BASE_URL:-http://host.docker.internal:5001/api/v1}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://host.docker.internal:8080/realms/mcad/protocol/openid-connect/token}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-mcad-frontend}"
KEYCLOAK_USERNAME="${KEYCLOAK_USERNAME:-analista.teste}"
KEYCLOAK_PASSWORD="${KEYCLOAK_PASSWORD:-Analista123!}"
VUS="${VUS:-1}"
DURATION="${DURATION:-5m}"
PACE_MULTIPLIER="${PACE_MULTIPLIER:-5}"

echo "============================================================"
echo " Simulador de Carga — Validação Funcional (Task 5.0)"
echo " ${VUS} VU × ${DURATION} (PACE_MULTIPLIER=${PACE_MULTIPLIER})"
echo "============================================================"
echo ""

# ── 1. Build das imagens ───────────────────────────────────────────────────
echo "[1/5] Buildando imagens docker..."

cd "${SCRIPT_DIR}"
docker build -t "${SIM_IMAGE}" . --quiet

cd "${SCRIPT_DIR}/mock-iswc"
docker build -t "${MOCK_IMAGE}" . --quiet

cd "${SCRIPT_DIR}"

# ── 2. Iniciar mock ISWC ───────────────────────────────────────────────────
echo "[2/5] Iniciando mock ISWC na porta 8090..."

# Para e remove container anterior se existir
docker rm -f "${MOCK_CONTAINER}" 2>/dev/null || true

docker run -d \
  --name "${MOCK_CONTAINER}" \
  -p 8090:8090 \
  "${MOCK_IMAGE}"

# Aguarda o mock ficar disponível
for i in $(seq 1 10); do
  if curl -s -o /dev/null -w "%{http_code}" \
      -X POST http://localhost:8090/api/iswc \
      -H "Content-Type: application/json" \
      -d '{"work_title":"test","authors":["test"],"association_code":"ABRAMUS"}' \
      2>/dev/null | grep -q "200"; then
    echo "[2/5] Mock ISWC disponível."
    break
  fi
  if [ "${i}" -eq 10 ]; then
    echo "[2/5] AVISO: Mock ISWC não respondeu — o cenário de depuração pode não executar."
    echo "       Para ativar, configure ISWC_BASE_URL=http://localhost:8090 na API."
  fi
  sleep 1
done

# ── 3. Verificar cadastro-api ──────────────────────────────────────────────
echo "[3/5] Verificando cadastro-api em localhost:5001..."

if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/health 2>/dev/null | grep -q "200"; then
  echo ""
  echo "ERRO: cadastro-api não está respondendo em localhost:5001"
  echo "      Inicie a API antes de rodar a validação:"
  echo "      cd services/cadastro-api && ISWC_BASE_URL=http://localhost:8090 dotnet run"
  echo ""
  docker rm -f "${MOCK_CONTAINER}" 2>/dev/null || true
  exit 1
fi

echo "[3/5] cadastro-api disponível."
echo ""
echo "NOTA: Para habilitar depuração (cenário D), reinicie a API com:"
echo "      ISWC_BASE_URL=http://localhost:8090 dotnet run"
echo ""

# ── 4. Executar simulador ──────────────────────────────────────────────────
echo "[4/5] Executando simulador k6 (${VUS} VU × ${DURATION})..."
echo ""

EXIT_CODE=0
docker run --rm \
  -e API_BASE_URL="${API_BASE_URL}" \
  -e VUS="${VUS}" \
  -e DURATION="${DURATION}" \
  -e PACE_MULTIPLIER="${PACE_MULTIPLIER}" \
  -e AUTH_ENABLED=true \
  -e KEYCLOAK_URL="${KEYCLOAK_URL}" \
  -e KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID}" \
  -e KEYCLOAK_USERNAME="${KEYCLOAK_USERNAME}" \
  -e KEYCLOAK_PASSWORD="${KEYCLOAK_PASSWORD}" \
  "${SIM_IMAGE}" || EXIT_CODE=$?

# ── 5. Parar mock ISWC ────────────────────────────────────────────────────
echo ""
echo "[5/5] Parando mock ISWC..."
docker rm -f "${MOCK_CONTAINER}" 2>/dev/null || true

# ── Resultado ──────────────────────────────────────────────────────────────
echo ""
echo "============================================================"
if [ "${EXIT_CODE}" -eq 0 ]; then
  echo " VALIDAÇÃO CONCLUÍDA COM SUCESSO"
  echo " Critérios verificados:"
  echo "   [OK] 0% error rate (http_req_failed < 5%)"
  echo "   [OK] p(95) latência < 2000ms"
  echo "   [OK] Obras e fonogramas criados"
  echo "   [OK] Cenário de bloqueio executado"
else
  echo " VALIDAÇÃO FALHOU (exit code: ${EXIT_CODE})"
  echo " Verifique o summary do k6 acima para detalhes."
fi
echo "============================================================"

exit "${EXIT_CODE}"
