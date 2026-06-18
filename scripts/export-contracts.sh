#!/usr/bin/env bash
#
# export-contracts.sh — materializa os contratos OpenAPI/AsyncAPI em contracts/.
#
# Os specs sao ARTEFATOS GERADOS a partir do codigo (springdoc/Swashbuckle/Saunter).
# Este script faz curl dos endpoints dos servicos RODANDO localmente, normaliza o
# JSON de forma deterministica e grava em contracts/<servico>/.
#
# Os AsyncAPI dos servicos Java (arrecadacao, distribuicao) sao HANDWRITTEN
# (contracts/*/asyncapi.yaml) e NAO sao tocados por este script.
#
# Pre-requisito: os 4 servicos precisam estar de pe apontando para a infra LOCAL.
# Veja a receita de boot em contracts/README.md.
#
# Uso:
#   scripts/export-contracts.sh           # gera/atualiza os arquivos em contracts/
#   scripts/export-contracts.sh --check   # NAO escreve; falha (exit 1) se houver drift
#                                          # (spec do servico != arquivo commitado). Para o CI.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"

CHECK_MODE=false
[[ "${1:-}" == "--check" ]] && CHECK_MODE=true

# servico | url | caminho relativo em contracts/
SPECS=(
  "cadastro|http://localhost:5001/swagger/v1/swagger.json|cadastro/openapi.json"
  "cadastro|http://localhost:5001/asyncapi/asyncapi.json|cadastro/asyncapi.json"
  "identificacao|http://localhost:5100/swagger/v1/swagger.json|identificacao/openapi.json"
  "identificacao|http://localhost:5100/asyncapi/asyncapi.json|identificacao/asyncapi.json"
  "arrecadacao|http://localhost:5003/v3/api-docs|arrecadacao/openapi.json"
  "distribuicao|http://localhost:5004/v3/api-docs|distribuicao/openapi.json"
)

# Normalizacao deterministica (sort_keys) para que o --check so acuse mudanca real.
normalize() {
  python3 -c 'import json,sys; json.dump(json.load(sys.stdin), sys.stdout, indent=2, ensure_ascii=False, sort_keys=True); print()'
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# AsyncAPI gerado pelo Saunter (.NET) precisa de pos-processamento para o Microcks:
# inline do binding AMQP (Saunter emite $ref, que o async-minion nao resolve) e
# merge de exemplos CloudEvents do sidecar contracts/<svc>/async-examples.yaml.
# Tambem normaliza (sort_keys). Os AsyncAPI Java sao handwritten e nao passam aqui.
normalize_asyncapi() {  # $1 = sidecar (pode nao existir)
  local sidecar="$1"
  [[ -f "$sidecar" ]] || sidecar=""
  python3 "$SCRIPT_DIR/normalize-asyncapi.py" "$sidecar"
}

fail=0
for entry in "${SPECS[@]}"; do
  IFS='|' read -r svc url rel <<< "$entry"
  target="$CONTRACTS_DIR/$rel"
  tmp="$(mktemp)"

  http_code="$(curl -s -o "$tmp.raw" -w '%{http_code}' --max-time 20 "$url" || true)"
  if [[ "$http_code" != "200" ]]; then
    echo "ERRO: $svc — $url retornou HTTP $http_code (servico de pe? ver contracts/README.md)" >&2
    rm -f "$tmp" "$tmp.raw"
    fail=1
    continue
  fi

  # AsyncAPI dos servicos .NET passa pelo pos-processador (inline binding + exemplos).
  if [[ "$rel" == */asyncapi.json ]]; then
    proc=(normalize_asyncapi "$CONTRACTS_DIR/$svc/async-examples.yaml")
  else
    proc=(normalize)
  fi

  if ! "${proc[@]}" < "$tmp.raw" > "$tmp" 2>/dev/null; then
    echo "ERRO: $svc — resposta de $url nao e JSON valido (ou falha no pos-processamento)" >&2
    rm -f "$tmp" "$tmp.raw"
    fail=1
    continue
  fi

  if $CHECK_MODE; then
    if [[ ! -f "$target" ]] || ! diff -q "$target" "$tmp" >/dev/null; then
      echo "DRIFT: $rel difere do gerado por $url" >&2
      fail=1
    else
      echo "ok: $rel"
    fi
  else
    mkdir -p "$(dirname "$target")"
    mv "$tmp.raw" /dev/null 2>/dev/null || true
    mv "$tmp" "$target"
    echo "gravado: $rel"
  fi
  rm -f "$tmp" "$tmp.raw"
done

if [[ $fail -ne 0 ]]; then
  $CHECK_MODE && echo "FALHA: contratos com drift (rode scripts/export-contracts.sh para atualizar)." >&2
  exit 1
fi

echo "OK."
