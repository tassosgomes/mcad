#!/bin/sh
# Carrega segredos montados como docker secrets (padrão *_FILE) e inicia a app Java.
# Spring lê os campos separados de RabbitMQ; só a senha é segredo.
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

load_secret_file DB_PASSWORD_DISTRIBUICAO
load_secret_file RABBITMQ_PASSWORD
load_secret_file CADASTRO_SERVICE_TOKEN

exec java ${JAVA_OPTS:-} -jar /app/app.jar "$@"
