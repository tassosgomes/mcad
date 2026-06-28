#!/bin/sh
# Carrega segredos (padrão *_FILE) e compõe RABBITMQ_URL. Diferente do cadastro, os
# publishers/consumers do identificacao leem RABBITMQ_URL diretamente (não montam de campos),
# então a URL DEVE estar definida. Compomos a partir dos campos não-sensíveis + a senha.
# Premissa: credencial RabbitMQ é URL-safe (CloudAMQP usa alfanumérico). Se a senha tiver
# caracteres especiais, prefira armazenar RABBITMQ_URL completo como secret.
set -eu

load_secret_file() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  file_path="$(eval "printf '%s' \"\${${file_variable_name}:-}\"")"
  if [ -n "$file_path" ]; then
    if [ ! -f "$file_path" ]; then
      echo "Secret file not found: $file_path" >&2
      exit 1
    fi
    export "$variable_name=$(cat "$file_path")"
  fi
}

load_secret_file IDENTIFICACAO_DB_PASSWORD
load_secret_file RABBITMQ_PASSWORD
load_secret_file STORAGE_LOGTO_CLIENT_SECRET
load_secret_file CADASTRO_LOGTO_CLIENT_SECRET

if [ -z "${RABBITMQ_URL:-}" ] && [ -n "${RABBITMQ_PASSWORD:-}" ]; then
  export RABBITMQ_URL="amqp://${RABBITMQ_USER:-mcad}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST:?RABBITMQ_HOST required}:${RABBITMQ_PORT:-5672}/${RABBITMQ_VHOST:-mcad}"
fi

exec dotnet Identificacao.API.dll
