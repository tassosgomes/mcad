#!/bin/bash
# Validação manual do fluxo de rubricas
set -e

ARRECADACAO_URL="http://localhost:5003/api/v1"
DISTRIBUICAO_URL="http://localhost:5004/api/v1"

echo "=== 1. Listar rubricas ==="
curl -s "$ARRECADACAO_URL/rubricas" | jq '.[] | {sigla, nome, ativo}'

echo "=== 2. Criar nova rubrica ==="
RESPONSE=$(curl -s -X POST "$ARRECADACAO_URL/rubricas" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Podcast","exigeClassificacao":false}')
echo "$RESPONSE" | jq '{id, sigla, nome, ativo}'
RUBRICA_ID=$(echo "$RESPONSE" | jq -r '.id')

echo "=== 3. Inativar rubrica ==="
curl -s -X POST "$ARRECADACAO_URL/rubricas/$RUBRICA_ID/inativar" \
  -H "Content-Type: application/json" \
  -d '{"justificativa":"Segmento nao utilizado no momento"}' | jq '{sigla, ativo}'

echo "=== 4. Verificar que Distribuicao sincronizou ==="
curl -s "$DISTRIBUICAO_URL/rubricas" | jq '.[] | select(.sigla == "PODCAST") | {sigla, ativo}'

echo "=== 5. Reativar rubrica ==="
curl -s -X POST "$ARRECADACAO_URL/rubricas/$RUBRICA_ID/ativar" \
  -H "Content-Type: application/json" \
  -d '{"justificativa":"Segmento retomado"}' | jq '{sigla, ativo}'

echo "=== 6. Verificar que Distribuicao reativou ==="
curl -s "$DISTRIBUICAO_URL/rubricas" | jq '.[] | select(.sigla == "PODCAST") | {sigla, ativo}'

echo "=== Validacao concluida ==="
