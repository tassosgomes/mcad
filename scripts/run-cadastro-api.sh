#!/usr/bin/env bash
# scripts/run-cadastro-api.sh
# Inicia o Cadastro.API carregando as variáveis do .env
# Uso: ./scripts/run-cadastro-api.sh

set -euo pipefail

ENV_FILE="$(dirname "$0")/../services/cadastro-api/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Arquivo .env não encontrado em: $ENV_FILE"
  exit 1
fi

echo "📦 Carregando variáveis de $ENV_FILE"
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

echo "🚀 Iniciando Cadastro.API..."
exec dotnet run \
  --project services/cadastro-api/1-Services/Cadastro.API \
  --launch-profile http
